from __future__ import annotations

import json
import os
from typing import Any

import httpx
from pydantic import ValidationError

from .models import FortuneResult, ProfileResponse

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
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
            # Remove markdown fence if the model wraps JSON in code block.
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

    def generate_result(self, profile: ProfileResponse, feature_type: str, period_key: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None

        request_payload = {
            "contents": [{"parts": [{"text": self._prompt(profile, feature_type, period_key)}]}],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.9,
                "maxOutputTokens": 700,
                "responseMimeType": "application/json",
            },
        }

        url = GEMINI_API_URL.format(model=self.model)
        params = {"key": self.api_key}

        for _ in range(2):
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.post(url, params=params, json=request_payload)
                    response.raise_for_status()
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(self._extract_json_text(text))
                validated = FortuneResult.model_validate(parsed)
                return validated.model_dump()
            except (
                httpx.HTTPError,
                KeyError,
                IndexError,
                json.JSONDecodeError,
                ValidationError,
                TypeError,
            ):
                continue

        return None


narrator = GeminiNarrator()
