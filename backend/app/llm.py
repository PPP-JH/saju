from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from pydantic import ValidationError

from .models import FortuneResult, ProfileResponse

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_STREAM_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"


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
        return (
            "사주 허브 백엔드용 결과 JSON을 생성하세요. 사용자 노출 문구에서 AI라는 단어를 쓰지 마세요. "
            "반드시 JSON 객체만 반환하고, 마크다운/코드펜스/설명 문장은 금지합니다.\n"
            f"feature_type: {feature_type}\n"
            f"period_key: {period_key}\n"
            f"profile: {json.dumps(profile_payload, ensure_ascii=False)}\n"
            f"output_schema: {json.dumps(schema_hint, ensure_ascii=False)}"
        )

    def _request_payload(self, profile: ProfileResponse, feature_type: str, period_key: str) -> dict[str, Any]:
        return {
            "contents": [{"parts": [{"text": self._prompt(profile, feature_type, period_key)}]}],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.9,
                "maxOutputTokens": 700,
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
            except (httpx.HTTPError, KeyError, IndexError, TypeError):
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
        except httpx.HTTPError:
            return


narrator = GeminiNarrator()
