from __future__ import annotations

import hashlib
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

HEAVENLY_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
EARTHLY_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
TEN_GOD_KEYS = ["비견", "식상", "재성", "관성", "인성"]

RULES_VERSION = "v1"
PROMPT_VERSION = "v1"


class DatabaseStore:
    def __init__(self) -> None:
        self._lock = Lock()

    @staticmethod
    def _hash_profile_input(payload: ProfileCreateRequest) -> str:
        material = "|".join(
            [
                payload.name.strip().lower(),
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

    @staticmethod
    def _pick_pair(seed: int, offset: int) -> list[str]:
        stem = HEAVENLY_STEMS[(seed + offset) % len(HEAVENLY_STEMS)]
        branch = EARTHLY_BRANCHES[(seed * 2 + offset) % len(EARTHLY_BRANCHES)]
        return [stem, branch]

    def _compute_profile(self, profile_id: str, payload: ProfileCreateRequest, input_hash: str) -> ProfileResponse:
        seed = int(input_hash[:8], 16)
        pillars = Pillars(
            year=self._pick_pair(seed, 1),
            month=self._pick_pair(seed, 7),
            day=self._pick_pair(seed, 13),
            time=self._pick_pair(seed, 19 if payload.birth_time else 23),
        )

        base_counts = [1, 1, 1, 1, 1]
        for i in range(3):
            idx = (seed >> (i * 3)) % 5
            base_counts[idx] += 1

        elements = Elements(
            wood=base_counts[0],
            fire=base_counts[1],
            earth=base_counts[2],
            metal=base_counts[3],
            water=base_counts[4],
        )

        levels = ["약함", "보통", "강함"]
        ten_gods_summary = {
            key: levels[(seed >> idx) % len(levels)] for idx, key in enumerate(TEN_GOD_KEYS)
        }

        dominant = max(
            {
                "목": elements.wood,
                "화": elements.fire,
                "토": elements.earth,
                "금": elements.metal,
                "수": elements.water,
            }.items(),
            key=lambda item: item[1],
        )[0]

        summary_text = f"{dominant}의 기운이 중심이 되는 균형형 사주"
        keywords = [
            {
                "목": "성장성",
                "화": "추진력",
                "토": "안정감",
                "금": "결단력",
                "수": "유연성",
            }[dominant],
            "성실함",
            "흐름 대응력",
        ]

        return ProfileResponse(
            profile_id=profile_id,
            pillars=pillars,
            elements=elements,
            ten_gods_summary=ten_gods_summary,
            summary_text=summary_text,
            keywords=keywords,
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

    def _build_result_json(self, profile: ProfileResponse, feature_type: str, period_key: str, seed_hex: str) -> dict:
        score = self._base_score(seed_hex)

        title_map = {
            "week": "흐름을 정리하고 성과를 만드는 주",
            "money_week": "지출 균형을 맞추기 좋은 주",
            "love_week": "관계의 밀도를 높이기 좋은 주",
            "work_week": "우선순위 정리가 성과를 만드는 주",
            "profile_detail": "내 사주의 핵심 흐름 정리",
        }
        title = title_map.get(feature_type, "이번 흐름 요약")

        result = {
            "title": title,
            "summary": f"{feature_type} 기준 분석입니다. 동일 조건에서는 동일 결과를 제공합니다.",
            "score": score,
            "details": [
                {
                    "subtitle": "핵심",
                    "content": f"{profile.summary_text}. 이번 기간({period_key})에는 계획을 단순하게 유지할수록 성과가 납니다.",
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
                "주요 결정은 오전보다 오후에 점검 후 확정하세요.",
                "이번 주 핵심 목표 1개만 남기고 나머지는 보류하세요.",
            ],
        }
        return FortuneResult.model_validate(result).model_dump()

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

    def create_or_get_read(self, profile_id: str, feature_type: str, period_key: str) -> tuple[str, bool]:
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
                existing = db.scalar(select(FortuneRead).where(FortuneRead.cache_key == cache_key))
                if existing:
                    return existing.read_id, True

                read_id = self._build_read_id(cache_key)
                profile = ProfileResponse.model_validate(profile_row.computed_json)
                fallback_json = self._build_result_json(
                    profile=profile,
                    feature_type=feature_type,
                    period_key=period_key,
                    seed_hex=cache_key,
                )
                llm_json = narrator.generate_result(
                    profile=profile,
                    feature_type=feature_type,
                    period_key=period_key,
                )
                result_json = llm_json or fallback_json

                row = FortuneRead(
                    read_id=read_id,
                    cache_key=cache_key,
                    profile_id=profile_id,
                    feature_type=feature_type,
                    period_key=period_key,
                    result_json=result_json,
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
