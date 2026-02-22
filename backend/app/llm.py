from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from pydantic import ValidationError

from .models import FortuneResult, ProfileResponse

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_STREAM_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
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
        style_guide = {
            "tone": [
                "사주 상담사가 차분하게 흐름을 읽어주는 문체",
                "단정적 운명론/공포 조장 금지",
                "사용자 존중형 표현 사용",
            ],
            "content_rules": [
                "summary는 4~6문장, 과장 없이 핵심 흐름 중심",
                "details는 4~6개, 각 content는 2~4문장",
                "actions는 바로 실행 가능한 문장형 조언",
                "elements/ten_gods_summary/keywords/pillars를 근거로 자연스럽게 반영",
                "같은 표현 반복을 피하고 문장을 충분히 구체화",
            ],
            "forbidden": [
                "AI",
                "모델",
                "정답",
                "100% 확정",
                "반드시 불행/파국",
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
            f"period_key: {period_key}\n"
            f"profile: {json.dumps(profile_payload, ensure_ascii=False)}\n"
            f"style_guide: {json.dumps(style_guide, ensure_ascii=False)}\n"
            f"output_schema: {json.dumps(schema_hint, ensure_ascii=False)}"
        )

    def _request_payload(self, profile: ProfileResponse, feature_type: str, period_key: str) -> dict[str, Any]:
        max_tokens_map = {
            "profile_detail": 1500,
            "week": 1300,
            "money_week": 1300,
            "love_week": 1300,
            "work_week": 1300,
        }
        return {
            "contents": [{"parts": [{"text": self._prompt(profile, feature_type, period_key)}]}],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.9,
                "maxOutputTokens": max_tokens_map.get(feature_type, 1300),
                "responseMimeType": "application/json",
            },
        }

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

        url = GEMINI_API_URL.format(model=self.model)
        params = {"key": self.api_key}
        payload = self._request_payload(profile, feature_type, period_key)

        for _ in range(2):
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.post(url, params=params, json=payload)
                    response.raise_for_status()
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                validated = self.parse_result_text(text)
                if validated is not None:
                    return validated
                logger.warning(
                    "Gemini non-stream response failed schema validation: feature_type=%s period_key=%s",
                    feature_type,
                    period_key,
                )
            except httpx.HTTPStatusError as err:
                request_id = (
                    err.response.headers.get("x-request-id")
                    or err.response.headers.get("x-cloud-trace-context")
                    or "-"
                )
                logger.error(
                    "Gemini non-stream HTTP error: status=%s request_id=%s feature_type=%s period_key=%s body=%s",
                    err.response.status_code,
                    request_id,
                    feature_type,
                    period_key,
                    err.response.text[:800],
                )
            except httpx.HTTPError as err:
                logger.error(
                    "Gemini non-stream transport error: feature_type=%s period_key=%s error=%s",
                    feature_type,
                    period_key,
                    str(err),
                )
            except (KeyError, IndexError, TypeError) as err:
                logger.error(
                    "Gemini non-stream parse error: feature_type=%s period_key=%s error=%s",
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

        url = GEMINI_STREAM_API_URL.format(model=self.model)
        params = {"key": self.api_key, "alt": "sse"}
        payload = self._request_payload(profile, feature_type, period_key)
        prior_text = ""

        timeout = httpx.Timeout(self.timeout_seconds, read=self.timeout_seconds)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", url, params=params, json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue

                        data_text = line[len("data:") :].strip()
                        if data_text == "[DONE]":
                            break

                        try:
                            event = json.loads(data_text)
                            current_text = event["candidates"][0]["content"]["parts"][0]["text"]
                        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
                            continue

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
        except httpx.HTTPStatusError as err:
            request_id = (
                err.response.headers.get("x-request-id")
                or err.response.headers.get("x-cloud-trace-context")
                or "-"
            )
            logger.error(
                "Gemini stream HTTP error: status=%s request_id=%s feature_type=%s period_key=%s body=%s",
                err.response.status_code,
                request_id,
                feature_type,
                period_key,
                err.response.text[:800],
            )
            return
        except httpx.HTTPError as err:
            logger.error(
                "Gemini stream transport error: feature_type=%s period_key=%s error=%s",
                feature_type,
                period_key,
                str(err),
            )
            return


narrator = GeminiNarrator()
