from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import UTC, datetime
from threading import Lock
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .db import SessionLocal
from .db_models import Feedback, FortuneProfile, FortuneRead
from .llm import narrator
from .models import (
    Elements,
    FeedbackCreateRequest,
    FortuneResult,
    Pillars,
    ProfileCreateRequest,
    ProfileResponse,
    ReadResponse,
)

logger = logging.getLogger(__name__)

# ── 한자 → 한글 변환표 ──────────────────────────────────────────────────────────
STEM_HAN_TO_KOR: dict[str, str] = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
    "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
}
BRANCH_HAN_TO_KOR: dict[str, str] = {
    "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진",
    "巳": "사", "午": "오", "未": "미", "申": "신", "酉": "유",
    "戌": "술", "亥": "해",
}

# ── 오행 매핑 ────────────────────────────────────────────────────────────────────
STEM_ELEMENT: dict[str, str] = {
    "甲": "wood", "乙": "wood",
    "丙": "fire", "丁": "fire",
    "戊": "earth", "己": "earth",
    "庚": "metal", "辛": "metal",
    "壬": "water", "癸": "water",
}
BRANCH_ELEMENT: dict[str, str] = {
    "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
    "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
    "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
}
ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"]
ELEMENT_TO_IDX: dict[str, int] = {e: i for i, e in enumerate(ELEMENT_ORDER)}
STEM_ELEMENT_IDX: dict[str, int] = {k: ELEMENT_TO_IDX[v] for k, v in STEM_ELEMENT.items()}
BRANCH_ELEMENT_IDX: dict[str, int] = {k: ELEMENT_TO_IDX[v] for k, v in BRANCH_ELEMENT.items()}
ELEMENT_KOR: dict[str, str] = {"wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수"}

# 십신 카테고리 (일간 기준 오행 인덱스 차이로 결정)
TEN_GOD_KEYS = ["비겁", "식상", "재성", "관성", "인성"]

# 오행별 대표 키워드
ELEMENT_KEYWORDS: dict[str, list[str]] = {
    "wood": ["성장성", "창의성", "추진력"],
    "fire": ["열정", "명예욕", "표현력"],
    "earth": ["안정감", "신뢰감", "실용성"],
    "metal": ["결단력", "원칙주의", "완성도"],
    "water": ["유연성", "적응력", "지혜"],
}

# 더미 폴백용 (sajupy 실패 시)
_HEAVENLY_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
_EARTHLY_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]

RULES_VERSION = "v1"
PROMPT_VERSION = "v1"

# 환경변수로 read 캐시 on/off 제어. 기본 활성화.
_CACHE_READS_ENABLED = os.getenv("CACHE_READS_ENABLED", "true").lower() not in ("false", "0", "no")


class DatabaseStore:
    def __init__(self) -> None:
        self._lock = Lock()

    @staticmethod
    def _hash_profile_input(payload: ProfileCreateRequest) -> str:
        material = "|".join(
            [
                payload.gender,
                payload.birth_date,
                payload.birth_time or "unknown",
                "lunar" if payload.is_lunar else "solar",
            ]
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_profile_id(input_hash: str) -> str:
        return str(uuid5(NAMESPACE_URL, f"profile:{input_hash}"))

    def _compute_profile(self, profile_id: str, payload: ProfileCreateRequest, input_hash: str) -> ProfileResponse:
        birth_year, birth_month, birth_day = map(int, payload.birth_date.split("-"))
        if payload.birth_time:
            hour, minute = map(int, payload.birth_time.split(":"))
        else:
            hour, minute = 12, 0  # 시간 미입력 시 午時(정오) 기본값

        try:
            from sajupy import calculate_saju, lunar_to_solar

            if payload.is_lunar:
                try:
                    solar = lunar_to_solar(birth_year, birth_month, birth_day)
                    birth_year = solar["solar_year"]
                    birth_month = solar["solar_month"]
                    birth_day = solar["solar_day"]
                except Exception:
                    logger.warning(
                        "Lunar-to-solar conversion failed for %s, treating as solar",
                        payload.birth_date,
                    )

            saju = calculate_saju(birth_year, birth_month, birth_day, hour, minute)

            def to_kor_pair(stem_han: str, branch_han: str) -> list[str]:
                return [
                    STEM_HAN_TO_KOR.get(stem_han, stem_han),
                    BRANCH_HAN_TO_KOR.get(branch_han, branch_han),
                ]

            pillars = Pillars(
                year=to_kor_pair(saju["year_stem"], saju["year_branch"]),
                month=to_kor_pair(saju["month_stem"], saju["month_branch"]),
                day=to_kor_pair(saju["day_stem"], saju["day_branch"]),
                time=to_kor_pair(saju["hour_stem"], saju["hour_branch"]),
            )

            # 오행 계산: 4천간 + 4지지 = 총 8글자
            elem_counts: dict[str, int] = {e: 0 for e in ELEMENT_ORDER}
            for s in [saju["year_stem"], saju["month_stem"], saju["day_stem"], saju["hour_stem"]]:
                elem_counts[STEM_ELEMENT.get(s, "earth")] += 1
            for b in [saju["year_branch"], saju["month_branch"], saju["day_branch"], saju["hour_branch"]]:
                elem_counts[BRANCH_ELEMENT.get(b, "earth")] += 1

            elements = Elements(
                wood=elem_counts["wood"],
                fire=elem_counts["fire"],
                earth=elem_counts["earth"],
                metal=elem_counts["metal"],
                water=elem_counts["water"],
            )

            # 십신 계산: 일간 기준 나머지 7글자
            day_elem_idx = STEM_ELEMENT_IDX.get(saju["day_stem"], 0)
            ten_god_counts: dict[str, int] = {k: 0 for k in TEN_GOD_KEYS}
            for x_idx in [
                STEM_ELEMENT_IDX.get(saju["year_stem"], 0),
                BRANCH_ELEMENT_IDX.get(saju["year_branch"], 0),
                STEM_ELEMENT_IDX.get(saju["month_stem"], 0),
                BRANCH_ELEMENT_IDX.get(saju["month_branch"], 0),
                BRANCH_ELEMENT_IDX.get(saju["day_branch"], 0),
                STEM_ELEMENT_IDX.get(saju["hour_stem"], 0),
                BRANCH_ELEMENT_IDX.get(saju["hour_branch"], 0),
            ]:
                diff = (x_idx - day_elem_idx) % 5
                ten_god_counts[TEN_GOD_KEYS[diff]] += 1

            level_map = {0: "약함", 1: "보통"}
            ten_gods_summary = {k: level_map.get(v, "강함") for k, v in ten_god_counts.items()}

            dominant_elem = max(elem_counts, key=lambda e: elem_counts[e])
            summary_text = f"{ELEMENT_KOR[dominant_elem]}의 기운이 중심이 되는 사주"
            keywords = ELEMENT_KEYWORDS[dominant_elem][:2] + ["흐름 대응력"]

            return ProfileResponse(
                profile_id=profile_id,
                pillars=pillars,
                elements=elements,
                ten_gods_summary=ten_gods_summary,
                summary_text=summary_text,
                keywords=keywords,
            )

        except Exception:
            logger.exception(
                "sajupy calculation failed for birth_date=%s, falling back to hash-based",
                payload.birth_date,
            )
            return self._compute_profile_fallback(profile_id, input_hash)

    def _compute_profile_fallback(self, profile_id: str, input_hash: str) -> ProfileResponse:
        """sajupy 실패 시 해시 기반 더미 폴백."""
        seed = int(input_hash[:8], 16)

        def _pick_pair(offset: int) -> list[str]:
            return [
                _HEAVENLY_STEMS[(seed + offset) % 10],
                _EARTHLY_BRANCHES[(seed * 2 + offset) % 12],
            ]

        pillars = Pillars(
            year=_pick_pair(1),
            month=_pick_pair(7),
            day=_pick_pair(13),
            time=_pick_pair(19),
        )
        base_counts = [1, 1, 1, 1, 1]
        for i in range(3):
            base_counts[(seed >> (i * 3)) % 5] += 1
        elements = Elements(
            wood=base_counts[0], fire=base_counts[1], earth=base_counts[2],
            metal=base_counts[3], water=base_counts[4],
        )
        levels = ["약함", "보통", "강함"]
        ten_gods_summary = {k: levels[(seed >> idx) % 3] for idx, k in enumerate(TEN_GOD_KEYS)}
        dominant_kor = max(
            {"목": elements.wood, "화": elements.fire, "토": elements.earth,
             "금": elements.metal, "수": elements.water}.items(),
            key=lambda x: x[1],
        )[0]
        return ProfileResponse(
            profile_id=profile_id,
            pillars=pillars,
            elements=elements,
            ten_gods_summary=ten_gods_summary,
            summary_text=f"{dominant_kor}의 기운이 중심이 되는 사주",
            keywords=["성장성", "성실함", "흐름 대응력"],
        )

    @staticmethod
    def _build_cache_key(input_hash: str, feature_type: str, period_key: str) -> str:
        raw = "|".join([input_hash, feature_type, period_key, RULES_VERSION, PROMPT_VERSION])
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_read_id(cache_key: str) -> str:
        return str(uuid5(NAMESPACE_URL, f"read:{cache_key}"))

    @staticmethod
    def _base_score(seed_hex: str) -> int:
        return 55 + (int(seed_hex[:2], 16) % 41)

    @staticmethod
    def _human_period_label(period_key: str) -> str:
        week_match = re.fullmatch(r"(\d{4})-W(\d{2})", period_key)
        if week_match:
            year, week = week_match.groups()
            return f"{year}년 {int(week)}주차"

        month_match = re.fullmatch(r"(\d{4})-(\d{2})", period_key)
        if month_match:
            year, month = month_match.groups()
            return f"{year}년 {int(month)}월"

        year_match = re.fullmatch(r"(\d{4})", period_key)
        if year_match:
            return f"{year_match.group(1)}년"

        return "이번 기간"

    def _build_result_json(self, profile: ProfileResponse, feature_type: str, period_key: str, seed_hex: str) -> dict:
        score = self._base_score(seed_hex)
        period_label = self._human_period_label(period_key)

        title_map = {
            "week": "흐름을 정리하고 성과를 만드는 주",
            "money_week": "지출 균형을 맞추기 좋은 주",
            "love_week": "관계의 밀도를 높이기 좋은 주",
            "work_week": "우선순위 정리가 성과를 만드는 주",
            "profile_detail": "내 사주의 핵심 흐름 정리",
        }
        title = title_map.get(feature_type, "이번 흐름 요약")
        summary_map = {
            "profile_detail": f"{profile.summary_text}를 중심으로 현재의 강점과 보완점을 함께 살펴보는 흐름입니다.",
            "week": f"{period_label}에는 흐름을 단순하게 정리할수록 성과가 또렷해집니다.",
            "money_week": f"{period_label}에는 지출 균형을 먼저 잡고, 작은 절약을 꾸준히 이어가는 전략이 유리합니다.",
            "love_week": f"{period_label}에는 감정 표현의 밀도를 높이는 대화가 관계 안정에 도움이 됩니다.",
            "work_week": f"{period_label}에는 우선순위를 명확히 잡으면 업무 완성도와 신뢰가 함께 올라갑니다.",
        }

        result = {
            "title": title,
            "summary": summary_map.get(feature_type, f"{period_label}의 흐름을 차분히 살펴보는 시기입니다."),
            "score": score,
            "details": [
                {
                    "subtitle": "핵심",
                    "content": f"{profile.summary_text}. {period_label}에는 계획을 단순하게 유지할수록 성과가 납니다.",
                },
                {
                    "subtitle": "주의",
                    "content": "과도한 확장보다 이미 진행 중인 일의 완성도를 우선하세요.",
                },
                {
                    "subtitle": "기회",
                    "content": f"강점 키워드 {', '.join(profile.keywords[:2])}을 활용한 선택이 유리합니다.",
                },
            ],
            "actions": [
                "중요한 결정은 한 번 더 점검한 뒤 차분히 확정해보세요.",
                "핵심 목표를 한두 가지로 좁히면 집중력이 살아납니다.",
            ],
        }
        return FortuneResult.model_validate(result).model_dump()

    def build_fallback_result(self, profile: ProfileResponse, feature_type: str, period_key: str, input_hash: str) -> dict:
        cache_key = self._build_cache_key(
            input_hash=input_hash,
            feature_type=feature_type,
            period_key=period_key,
        )
        return self._build_result_json(
            profile=profile,
            feature_type=feature_type,
            period_key=period_key,
            seed_hex=cache_key,
        )

    def create_or_get_profile(self, payload: ProfileCreateRequest) -> tuple[str, bool]:
        input_hash = self._hash_profile_input(payload)

        with self._lock:
            with SessionLocal() as db:
                existing = db.scalar(select(FortuneProfile).where(FortuneProfile.input_hash == input_hash))
                if existing:
                    return existing.profile_id, True

                profile_id = self._build_profile_id(input_hash)
                computed = self._compute_profile(profile_id, payload, input_hash)

                row = FortuneProfile(
                    profile_id=profile_id,
                    input_hash=input_hash,
                    payload_json=payload.model_dump(),
                    computed_json=computed.model_dump(),
                    created_at=datetime.now(UTC),
                )
                db.add(row)
                try:
                    db.commit()
                    return profile_id, False
                except IntegrityError:
                    db.rollback()
                    existing = db.scalar(select(FortuneProfile).where(FortuneProfile.input_hash == input_hash))
                    if not existing:
                        raise
                    return existing.profile_id, True

    def get_profile(self, profile_id: str) -> ProfileResponse | None:
        with SessionLocal() as db:
            row = db.scalar(select(FortuneProfile).where(FortuneProfile.profile_id == profile_id))
            if not row:
                return None
            return ProfileResponse.model_validate(row.computed_json)

    def get_profile_bundle(self, profile_id: str) -> tuple[ProfileResponse, str] | None:
        with SessionLocal() as db:
            row = db.scalar(select(FortuneProfile).where(FortuneProfile.profile_id == profile_id))
            if not row:
                return None
            return ProfileResponse.model_validate(row.computed_json), row.input_hash

    def get_cached_read(self, input_hash: str, feature_type: str, period_key: str) -> ReadResponse | None:
        if not _CACHE_READS_ENABLED:
            return None
        cache_key = self._build_cache_key(
            input_hash=input_hash,
            feature_type=feature_type,
            period_key=period_key,
        )
        with SessionLocal() as db:
            row = db.scalar(select(FortuneRead).where(FortuneRead.cache_key == cache_key))
            if not row:
                return None
            return ReadResponse(
                read_id=row.read_id,
                feature_type=row.feature_type,
                period_key=row.period_key,
                result_json=row.result_json,
            )

    def create_or_get_read_from_result(
        self,
        profile_id: str,
        feature_type: str,
        period_key: str,
        result_json: dict,
    ) -> tuple[str, bool]:
        with self._lock:
            with SessionLocal() as db:
                profile_row = db.scalar(select(FortuneProfile).where(FortuneProfile.profile_id == profile_id))
                if not profile_row:
                    raise KeyError("profile not found")

                cache_key = self._build_cache_key(
                    input_hash=profile_row.input_hash,
                    feature_type=feature_type,
                    period_key=period_key,
                )

                # 캐시 비활성화 시: 기존 row 삭제 후 새 결과로 교체
                if not _CACHE_READS_ENABLED:
                    validated = FortuneResult.model_validate(result_json).model_dump()
                    read_id = self._build_read_id(cache_key)
                    existing = db.scalar(select(FortuneRead).where(FortuneRead.cache_key == cache_key))
                    if existing:
                        db.delete(existing)
                        db.flush()
                    row = FortuneRead(
                        read_id=read_id,
                        cache_key=cache_key,
                        profile_id=profile_id,
                        feature_type=feature_type,
                        period_key=period_key,
                        result_json=validated,
                        created_at=datetime.now(UTC),
                    )
                    db.add(row)
                    db.commit()
                    return read_id, False

                existing = db.scalar(select(FortuneRead).where(FortuneRead.cache_key == cache_key))
                if existing:
                    return existing.read_id, True

                read_id = self._build_read_id(cache_key)
                validated = FortuneResult.model_validate(result_json).model_dump()
                row = FortuneRead(
                    read_id=read_id,
                    cache_key=cache_key,
                    profile_id=profile_id,
                    feature_type=feature_type,
                    period_key=period_key,
                    result_json=validated,
                    created_at=datetime.now(UTC),
                )
                db.add(row)
                try:
                    db.commit()
                    return read_id, False
                except IntegrityError:
                    db.rollback()
                    existing = db.scalar(select(FortuneRead).where(FortuneRead.cache_key == cache_key))
                    if not existing:
                        raise
                    return existing.read_id, True

    def create_or_get_read(self, profile_id: str, feature_type: str, period_key: str) -> tuple[str, bool]:
        bundle = self.get_profile_bundle(profile_id)
        if not bundle:
            raise KeyError("profile not found")

        profile, input_hash = bundle
        cached = self.get_cached_read(input_hash=input_hash, feature_type=feature_type, period_key=period_key)
        if cached:
            return cached.read_id, True

        fallback_json = self.build_fallback_result(
            profile=profile,
            feature_type=feature_type,
            period_key=period_key,
            input_hash=input_hash,
        )
        llm_json = narrator.generate_result(
            profile=profile,
            feature_type=feature_type,
            period_key=period_key,
        )
        read_id, cached_after = self.create_or_get_read_from_result(
            profile_id=profile_id,
            feature_type=feature_type,
            period_key=period_key,
            result_json=llm_json or fallback_json,
        )
        return read_id, cached_after

    def get_read(self, read_id: str) -> ReadResponse | None:
        with SessionLocal() as db:
            row = db.scalar(select(FortuneRead).where(FortuneRead.read_id == read_id))
            if not row:
                return None
            return ReadResponse(
                read_id=row.read_id,
                feature_type=row.feature_type,
                period_key=row.period_key,
                result_json=row.result_json,
            )

    def add_feedback(self, payload: FeedbackCreateRequest) -> None:
        with SessionLocal() as db:
            read = db.scalar(select(FortuneRead).where(FortuneRead.read_id == payload.read_id))
            if not read:
                raise KeyError("read not found")

            row = Feedback(
                read_id=payload.read_id,
                rating=payload.rating,
                comment=payload.comment,
                flag_inaccurate=payload.flag_inaccurate,
                created_at=datetime.now(UTC),
            )
            db.add(row)
            db.commit()


store = DatabaseStore()
