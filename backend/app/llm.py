from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import ValidationError

from .models import FortuneResult, ProfileResponse

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
logger = logging.getLogger(__name__)


class GeminiNarrator:
    def __init__(self) -> None:
        self.api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        self.model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self.timeout_seconds = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "12"))

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def _is_model_error(err: APIError) -> bool:
        response_json = getattr(err, "response_json", {})
        if isinstance(response_json, dict):
            status = response_json.get("error", {}).get("status", "")
            message = response_json.get("error", {}).get("message", "")
            text = f"{status} {message}".lower()
        else:
            text = str(err).lower()
        return (
            "model" in text
            and ("not found" in text or "not supported" in text or "invalid argument" in text)
        )

    @staticmethod
    def _extract_json_text(raw_text: str) -> str:
        text = raw_text.strip()
        if text.startswith("```"):
            parts = text.split("```")
            for part in parts:
                candidate = part.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                if candidate.startswith("{") and candidate.endswith("}"):
                    return candidate
        return text

    @staticmethod
    def _period_label(feature_type: str) -> str:
        """Convert feature_type to natural Korean time label."""
        if feature_type in ("week", "money_week", "love_week", "work_week"):
            return "이번 주"
        if feature_type == "profile_detail":
            return "현재"
        return "이번 기간"

    @staticmethod
    def _prompt(profile: ProfileResponse, feature_type: str, period_key: str) -> str:
        profile_payload = {
            "pillars": profile.pillars.model_dump(),
            "summary_text": profile.summary_text,
            "keywords": profile.keywords,
            "elements": profile.elements.model_dump(),
            "ten_gods_summary": profile.ten_gods_summary,
        }
        period_label = GeminiNarrator._period_label(feature_type)
        is_profile = feature_type == "profile_detail"
        is_timeless = feature_type in ("profile_detail", "money", "love", "work")

        if is_profile:
            schema_hint = {
                "title": "string — 일간 기질을 한 문장으로 (예: '갑목의 사람, 뻗어나가는 기운')",
                "summary": "string — 산문 풀이 전체를 한 문장으로 요약 (캐시/검색용)",
                "score": 50,
                "details": [{"subtitle": "string", "content": "string"}],
                "actions": ["string"],
            }
            content_rules = [
                "출력은 반드시 세 단계로 구성한다:",
                "  [0단계: 타이틀] 맨 첫 줄에 정확히 이 형식으로 출력(따옴표·공백 없이): [TITLE]일간 기질을 한 문장으로[/TITLE]",
                "  [1단계: 산문 풀이] 타이틀 다음 줄부터 12~18문장의 한국어 산문. 일간 기운 → 오행 강약 → 십성 기질 패턴 순으로 자연스럽게 서술. 마크다운/JSON 문법 금지. 사용자가 실시간으로 읽는 텍스트다.",
                "  [구분자] 산문 마지막 줄 바로 다음 줄에 이 문자열을 정확히 출력(따옴표 없이): ---END_NARRATIVE---",
                "  [2단계: JSON] 구분자 다음 줄부터 JSON 객체 출력. 마크다운 코드펜스 금지.",
                "details는 6~8개. subtitle은 삶의 테마(기질, 관계, 일, 건강, 재물, 성장 방향 등). content는 4~6문장, 사주 근거 명시.",
                "actions는 8~10개. 타임리스 삶의 방향 — '~하는 습관을 들이면 좋다', '~를 경계하라' 형태.",
                "pillars.day[0](일간 천간)을 반드시 특정하고 그 기운의 특성을 산문 출발점으로 삼을 것.",
                "오행 중 가장 많은 것과 없거나 적은 것을 반드시 언급하고 그 불균형이 성격/삶에 미치는 영향을 구체적으로 서술.",
                "ten_gods_summary에서 강한 성분을 인용해 기질 해석의 근거로 제시.",
                "시간·날짜·주차·연도 언급 완전 금지 — 이 풀이는 평생 유효한 성격/기질 분석임.",
                "같은 표현·유사 문장 반복 엄격히 금지 — 각 문장은 새로운 관점 제시.",
            ]
        elif feature_type in ("money", "love", "work"):
            _domain = {"money": "재물·돈", "love": "관계·애정", "work": "직업·일"}[feature_type]
            schema_hint = {
                "title": f"string — {_domain} 기질을 한 문장으로",
                "summary": "string — 산문 풀이 전체를 한 문장으로 요약 (캐시/검색용)",
                "score": 50,
                "details": [{"subtitle": "string", "content": "string"}],
                "actions": ["string"],
            }
            content_rules = [
                "출력은 반드시 세 단계로 구성한다:",
                f"  [0단계: 타이틀] 맨 첫 줄에 정확히 이 형식으로 출력(따옴표·공백 없이): [TITLE]{_domain} 기질을 한 문장으로[/TITLE]",
                f"  [1단계: 산문 풀이] 타이틀 다음 줄부터 12~18문장의 한국어 산문. 이 사람의 {_domain} 기질·패턴·강약점을 팔자 근거로 서술. 마크다운/JSON 문법 금지.",
                "  [구분자] 산문 마지막 줄 바로 다음 줄에 이 문자열을 정확히 출력(따옴표 없이): ---END_NARRATIVE---",
                "  [2단계: JSON] 구분자 다음 줄부터 JSON 객체 출력. 마크다운 코드펜스 금지.",
                "details는 6~8개. subtitle은 기질·패턴·삶의 테마. content는 4~6문장, 사주 근거 명시.",
                "actions는 8~10개. 타임리스 삶의 방향 — 이번 주/이번 달 언급 금지.",
                "pillars.day[0](일간)을 출발점으로 삼아 해당 도메인 기질을 서술.",
                "시간·날짜·주차·연도 언급 완전 금지 — 평생 유효한 기질 분석임.",
                "같은 표현·유사 문장 반복 엄격히 금지 — 각 문장은 새로운 관점 제시.",
            ]
        else:
            schema_hint = {
                "title": "string — 이번 주 핵심 기운을 한 문장으로",
                "summary": "string — 산문 풀이 전체를 한 문장으로 요약 (캐시/검색용)",
                "score": "int(0-100)",
                "details": [{"subtitle": "string", "content": "string"}],
                "actions": ["string"],
            }
            content_rules = [
                "출력은 반드시 세 단계로 구성한다:",
                "  [0단계: 타이틀] 맨 첫 줄에 정확히 이 형식으로 출력(따옴표·공백 없이): [TITLE]이번 주 핵심을 한 문장으로[/TITLE]",
                "  [1단계: 산문 풀이] 타이틀 다음 줄부터 10~15문장의 한국어 산문. 핵심 흐름 + 구체적 상황 묘사 + 실용 조언. 마크다운/JSON 문법 금지.",
                "  [구분자] 산문 마지막 줄 바로 다음 줄에 이 문자열을 정확히 출력(따옴표 없이): ---END_NARRATIVE---",
                "  [2단계: JSON] 구분자 다음 줄부터 JSON 객체 출력. 마크다운 코드펜스 금지.",
                "details는 6~8개, 각 content는 4~6문장으로 충분히 상세하게 작성",
                "actions는 8~10개, 바로 실행 가능한 구체적 문장형 조언",
                "elements/ten_gods_summary/keywords/pillars를 근거로 자연스럽게 반영",
                "같은 표현·유사 문장 반복 엄격히 금지 — 각 문장은 새로운 관점 제시",
                f"period_label('{period_label}')을 활용해 '이번 주에는', '이번 주 흐름은' 등 자연스러운 표현 사용",
                "'N주차', '2026년 N주', 날짜·주차 번호 직접 언급 금지",
            ]

        style_guide = {
            "tone": [
                "사주 상담사가 차분하게 흐름을 읽어주는 문체",
                "단정적 운명론/공포 조장 금지",
                "사용자 존중형 표현 사용",
            ],
            "content_rules": content_rules,
            "forbidden": [
                "AI",
                "모델",
                "정답",
                "100% 확정",
                "반드시 불행/파국",
                "N주차",
                "년 N주",
            ],
        }
        feature_hint = {
            "profile_detail": (
                "일간 기질 분석 + 오행 불균형 해석 + 십성 기질 패턴. "
                "시간에 묶이지 않는 타고난 성격·기질·삶의 패턴을 다룬다. "
                "운세(이번 주/이번 달)가 아닌 '이 사람은 어떤 사람인가'에 답해야 한다."
            ),
            "money": "재물·돈과의 관계 — 팔자에서 읽히는 타고난 재물 기질, 재성/식상 패턴, 돈을 대하는 방식.",
            "love": "관계·애정 — 팔자에서 읽히는 타고난 관계 패턴, 관성/인성 구조, 사람을 대하는 방식.",
            "work": "직업·일 — 팔자에서 읽히는 타고난 직업 기질, 관성/식상 패턴, 일을 대하는 방식.",
            "week": "이번 주 전체 흐름 중심",
        }

        output_rule = "출력 규칙: [TITLE]타이틀[/TITLE]\\n[산문 풀이]\\n---END_NARRATIVE---\\n[JSON 객체] 형식으로 출력. 마크다운/코드펜스 금지."
        base_prompt = (
            "역할: 사주해의 전문 풀이 작성자.\n"
            "목표: 입력된 사주 요약 근거를 바탕으로, 사용자에게 실용적이고 과장 없는 해석을 제공합니다.\n"
            f"{output_rule}\n"
            "문체 규칙: 'AI/모델' 등 구현 언급 금지, 단정적 예언 금지, 위로/조언 중심.\n"
            f"feature_type: {feature_type}\n"
            f"feature_focus: {feature_hint.get(feature_type, '현재 기간의 핵심 흐름 중심')}\n"
        )
        if not is_timeless:
            base_prompt += (
                f"period_label: {period_label}\n"
                "period_label_usage: summary/details/actions에서 시간 표현이 필요할 때 반드시 period_label 값만 사용하세요. '주차', '월', 연도·숫자 형식의 날짜 직접 언급 금지.\n"
            )
        return (
            base_prompt
            + f"profile: {json.dumps(profile_payload, ensure_ascii=False)}\n"
            f"style_guide: {json.dumps(style_guide, ensure_ascii=False)}\n"
            f"output_schema: {json.dumps(schema_hint, ensure_ascii=False)}"
        )

    def _request_payload(self, profile: ProfileResponse, feature_type: str, period_key: str, *, stream: bool = False) -> dict[str, Any]:
        max_tokens_map = {
            "profile_detail": 8192,
            "week": 8192,
            "money": 8192,
            "love": 8192,
            "work": 8192,
        }
        config_kwargs: dict[str, Any] = {
            "temperature": 0.4,
            "top_p": 0.9,
            "max_output_tokens": max_tokens_map.get(feature_type, 1300),
        }
        # response_mime_type="application/json" causes Gemini to buffer the full
        # response before streaming, defeating real-time output. Only set it for
        # non-streaming requests where we need structured JSON parsing.
        if not stream:
            config_kwargs["response_mime_type"] = "application/json"
        return {
            "contents": self._prompt(profile, feature_type, period_key),
            "config": types.GenerateContentConfig(**config_kwargs),
        }

    def _new_client(self, *, stream: bool = False) -> genai.Client:
        # HttpOptions.timeout은 밀리초 단위 (google-genai SDK 내부에서 /1000 변환)
        if stream:
            timeout_ms = int(os.getenv("GEMINI_STREAM_TIMEOUT_SECONDS", "120")) * 1000
        else:
            timeout_ms = int(self.timeout_seconds * 1000)
        return genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )

    _NARRATIVE_SEP = "---END_NARRATIVE---"

    def parse_result_text(self, raw_text: str) -> dict[str, Any] | None:
        text = raw_text
        if self._NARRATIVE_SEP in raw_text:
            text = raw_text.split(self._NARRATIVE_SEP, 1)[1].strip()
        try:
            parsed = json.loads(self._extract_json_text(text))
            validated = FortuneResult.model_validate(parsed)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError, TypeError):
            return None

    def generate_result(self, profile: ProfileResponse, feature_type: str, period_key: str) -> dict[str, Any] | None:
        if not self.enabled:
            logger.warning("Gemini disabled: GEMINI_API_KEY is not set.")
            return None

        payload = self._request_payload(profile, feature_type, period_key)
        client = self._new_client()
        model_candidates = [self.model]
        if self.model != DEFAULT_GEMINI_MODEL:
            model_candidates.append(DEFAULT_GEMINI_MODEL)

        for model_name in model_candidates:
            for _ in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=payload["contents"],
                        config=payload["config"],
                    )
                    text = response.text or ""
                    validated = self.parse_result_text(text)
                    if validated is not None:
                        return validated
                    logger.warning(
                        "Gemini non-stream response failed schema validation: model=%s feature_type=%s period_key=%s",
                        model_name,
                        feature_type,
                        period_key,
                    )
                except APIError as err:
                    logger.error(
                        "Gemini non-stream API error: model=%s status=%s remote_status=%s feature_type=%s period_key=%s body=%s",
                        model_name,
                        getattr(err, "status", getattr(err, "code", "-")),
                        getattr(err, "response_json", {}).get("error", {}).get("status", "-")
                        if isinstance(getattr(err, "response_json", {}), dict)
                        else "-",
                        feature_type,
                        period_key,
                        json.dumps(getattr(err, "response_json", {}), ensure_ascii=False)[:800],
                    )
                    if self._is_model_error(err):
                        break
                except Exception as err:
                    logger.error(
                        "Gemini non-stream unknown error: model=%s feature_type=%s period_key=%s error=%s",
                        model_name,
                        feature_type,
                        period_key,
                        str(err),
                    )
                    continue

        return None

    @staticmethod
    def _tooltip_prompt(profile: ProfileResponse, terms: list[str]) -> str:
        profile_payload = {
            "pillars": profile.pillars.model_dump(),
            "summary_text": profile.summary_text,
            "elements": profile.elements.model_dump(),
            "ten_gods_summary": profile.ten_gods_summary,
        }
        return (
            "역할: 사주해 용어 해설 작성자.\n"
            "목표: 아래 사주 용어 목록 각각을 이 사용자의 사주 맥락에 맞게 2문장으로 설명합니다.\n"
            "출력 규칙: JSON 객체만 반환하세요. 형식: {\"용어\": \"설명...\"}\n"
            "문체 규칙: 전문적이지만 쉽게, 사용자 맥락 중심, 마크다운 금지.\n"
            f"profile: {json.dumps(profile_payload, ensure_ascii=False)}\n"
            f"terms: {json.dumps(terms, ensure_ascii=False)}"
        )

    def generate_tooltips(self, profile: ProfileResponse, terms: list[str]) -> dict[str, str]:
        """주어진 사주 용어 목록에 대해 2문장 설명을 생성합니다. 실패 시 빈 dict 반환."""
        if not self.enabled or not terms:
            return {}

        prompt = self._tooltip_prompt(profile, terms)
        client = self._new_client()
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=200 * len(terms),
            response_mime_type="application/json",
        )
        model_candidates = [self.model]
        if self.model != DEFAULT_GEMINI_MODEL:
            model_candidates.append(DEFAULT_GEMINI_MODEL)

        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                raw = self._extract_json_text(response.text or "")
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return {k: str(v) for k, v in parsed.items() if k in terms}
            except APIError as err:
                logger.error(
                    "Gemini tooltip API error: model=%s terms=%s body=%s",
                    model_name,
                    terms,
                    json.dumps(getattr(err, "response_json", {}), ensure_ascii=False)[:400],
                )
                if self._is_model_error(err):
                    continue
            except Exception as err:
                logger.error("Gemini tooltip unknown error: model=%s error=%s", model_name, str(err))

        return {}

    async def stream_result_text(
        self,
        profile: ProfileResponse,
        feature_type: str,
        period_key: str,
    ) -> AsyncIterator[str]:
        if not self.enabled:
            logger.warning("Gemini stream disabled: GEMINI_API_KEY is not set.")
            return

        payload = self._request_payload(profile, feature_type, period_key, stream=True)
        prior_text = ""
        client = self._new_client(stream=True)
        model_candidates = [self.model]
        if self.model != DEFAULT_GEMINI_MODEL:
            model_candidates.append(DEFAULT_GEMINI_MODEL)

        for model_name in model_candidates:
            try:
                stream = await client.aio.models.generate_content_stream(
                    model=model_name,
                    contents=payload["contents"],
                    config=payload["config"],
                )
                async for chunk in stream:
                    current_text = chunk.text or ""
                    if not current_text:
                        continue

                    if current_text.startswith(prior_text):
                        delta = current_text[len(prior_text) :]
                        prior_text = current_text
                    else:
                        delta = current_text
                        prior_text += current_text

                    if delta:
                        yield delta
                return
            except APIError as err:
                logger.error(
                    "Gemini stream API error: model=%s status=%s remote_status=%s feature_type=%s period_key=%s body=%s",
                    model_name,
                    getattr(err, "status", getattr(err, "code", "-")),
                    getattr(err, "response_json", {}).get("error", {}).get("status", "-")
                    if isinstance(getattr(err, "response_json", {}), dict)
                    else "-",
                    feature_type,
                    period_key,
                    json.dumps(getattr(err, "response_json", {}), ensure_ascii=False)[:800],
                )
                if not self._is_model_error(err):
                    return
            except Exception as err:
                logger.exception(
                    "Gemini stream unknown error: model=%s type=%s feature_type=%s period_key=%s repr=%r",
                    model_name,
                    type(err).__name__,
                    feature_type,
                    period_key,
                    err,
                )
                return


narrator = GeminiNarrator()
