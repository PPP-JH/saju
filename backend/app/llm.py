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
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self.timeout_seconds = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "12"))

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

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
        schema_hint = {
            "title": "string",
            "summary": "string",
            "score": "int(0-100)",
            "details": [{"subtitle": "string", "content": "string"}],
            "actions": ["string"],
        }
        period_label = GeminiNarrator._period_label(feature_type)
        style_guide = {
            "tone": [
                "사주 상담사가 차분하게 흐름을 읽어주는 문체",
                "단정적 운명론/공포 조장 금지",
                "사용자 존중형 표현 사용",
            ],
            "content_rules": [
                "summary는 10~15문장, 핵심 흐름 + 구체적 상황 묘사 + 실용 조언을 균형 있게",
                "details는 6~8개, 각 content는 4~6문장으로 충분히 상세하게 작성",
                "actions는 8~10개, 바로 실행 가능한 구체적 문장형 조언",
                "elements/ten_gods_summary/keywords/pillars를 근거로 자연스럽게 반영",
                "같은 표현·유사 문장 반복 엄격히 금지 — 각 문장은 새로운 관점 제시",
                f"period_label('{period_label}')을 활용해 '이번 주에는', '이번 주 흐름은' 등 자연스러운 표현 사용",
                "'N주차', '2026년 N주', 날짜·주차 번호 직접 언급 금지",
            ],
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
            "profile_detail": "타고난 성향과 현재 읽는 법 중심",
            "week": "이번 주 전체 흐름 중심",
            "money_week": "재물/소비/저축 의사결정 중심",
            "love_week": "관계의 온도와 소통 중심",
            "work_week": "업무 우선순위와 협업 중심",
        }
        return (
            "역할: 사주 허브의 전문 풀이 작성자.\n"
            "목표: 입력된 사주 요약 근거를 바탕으로, 사용자에게 실용적이고 과장 없는 해석을 제공합니다.\n"
            "출력 규칙: 반드시 JSON 객체만 반환하세요. 마크다운/코드펜스/설명 문장 금지.\n"
            "문체 규칙: 'AI/모델' 등 구현 언급 금지, 단정적 예언 금지, 위로/조언 중심.\n"
            f"feature_type: {feature_type}\n"
            f"feature_focus: {feature_hint.get(feature_type, '현재 기간의 핵심 흐름 중심')}\n"
            f"period_label: {period_label}\n"
            "period_label_usage: summary/details/actions에서 시간 표현이 필요할 때 반드시 period_label 값만 사용하세요. '주차', '월', 연도·숫자 형식의 날짜 직접 언급 금지.\n"
            f"profile: {json.dumps(profile_payload, ensure_ascii=False)}\n"
            f"style_guide: {json.dumps(style_guide, ensure_ascii=False)}\n"
            f"output_schema: {json.dumps(schema_hint, ensure_ascii=False)}"
        )

    def _request_payload(self, profile: ProfileResponse, feature_type: str, period_key: str, *, stream: bool = False) -> dict[str, Any]:
        max_tokens_map = {
            "profile_detail": 8192,
            "week": 8192,
            "money_week": 8192,
            "love_week": 8192,
            "work_week": 8192,
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

    def parse_result_text(self, raw_text: str) -> dict[str, Any] | None:
        try:
            parsed = json.loads(self._extract_json_text(raw_text))
            validated = FortuneResult.model_validate(parsed)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError, TypeError):
            return None

    def generate_result(self, profile: ProfileResponse, feature_type: str, period_key: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None

        payload = self._request_payload(profile, feature_type, period_key)
        print(payload)
        client = self._new_client()

        for _ in range(2):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=payload["contents"],
                    config=payload["config"],
                )
                text = response.text or ""
                validated = self.parse_result_text(text)
                if validated is not None:
                    return validated
                logger.warning(
                    "Gemini non-stream response failed schema validation: feature_type=%s period_key=%s",
                    feature_type,
                    period_key,
                )
            except APIError as err:
                logger.error(
                    "Gemini non-stream API error: status=%s remote_status=%s feature_type=%s period_key=%s body=%s",
                    getattr(err, "status", getattr(err, "code", "-")),
                    getattr(err, "response_json", {}).get("error", {}).get("status", "-")
                    if isinstance(getattr(err, "response_json", {}), dict)
                    else "-",
                    feature_type,
                    period_key,
                    json.dumps(getattr(err, "response_json", {}), ensure_ascii=False)[:800],
                )
            except Exception as err:
                logger.error(
                    "Gemini non-stream unknown error: feature_type=%s period_key=%s error=%s",
                    feature_type,
                    period_key,
                    str(err),
                )
                continue

        return None

    async def stream_result_text(
        self,
        profile: ProfileResponse,
        feature_type: str,
        period_key: str,
    ) -> AsyncIterator[str]:
        if not self.enabled:
            return

        payload = self._request_payload(profile, feature_type, period_key, stream=True)
        prior_text = ""
        client = self._new_client(stream=True)

        try:
            stream = await client.aio.models.generate_content_stream(
                model=self.model,
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
        except APIError as err:
            logger.error(
                "Gemini stream API error: status=%s remote_status=%s feature_type=%s period_key=%s body=%s",
                getattr(err, "status", getattr(err, "code", "-")),
                getattr(err, "response_json", {}).get("error", {}).get("status", "-")
                if isinstance(getattr(err, "response_json", {}), dict)
                else "-",
                feature_type,
                period_key,
                json.dumps(getattr(err, "response_json", {}), ensure_ascii=False)[:800],
            )
            return
        except Exception as err:
            logger.exception(
                "Gemini stream unknown error: type=%s feature_type=%s period_key=%s repr=%r",
                type(err).__name__,
                feature_type,
                period_key,
                err,
            )
            return


narrator = GeminiNarrator()
