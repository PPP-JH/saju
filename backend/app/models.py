from __future__ import annotations

from datetime import date as _date
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Gender = Literal["M", "F"]


class ProfileCreateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    gender: Gender
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    birth_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    is_lunar: bool = False

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: str) -> str:
        year, month, day = map(int, value.split("-"))
        try:
            _date(year, month, day)
        except ValueError as exc:
            raise ValueError(f"유효하지 않은 날짜: {value}") from exc
        return value


class ProfileCreateResponse(BaseModel):
    profile_id: str


class Pillars(BaseModel):
    year: list[str]
    month: list[str]
    day: list[str]
    time: list[str]


class Elements(BaseModel):
    wood: int = Field(ge=0)
    fire: int = Field(ge=0)
    earth: int = Field(ge=0)
    metal: int = Field(ge=0)
    water: int = Field(ge=0)


class ProfileResponse(BaseModel):
    profile_id: str
    pillars: Pillars
    elements: Elements
    ten_gods_summary: dict[str, str]
    summary_text: str
    keywords: list[str]


class ReadCreateRequest(BaseModel):
    profile_id: str = Field(min_length=1)
    feature_type: str = Field(min_length=1, max_length=50, pattern=r"^[a-z_]+$")
    period_key: str = Field(min_length=1, max_length=30)


class ReadCreateResponse(BaseModel):
    read_id: str
    cached: bool


class ReadResponse(BaseModel):
    read_id: str
    feature_type: str
    period_key: str
    result_json: dict[str, Any]


class FortuneDetail(BaseModel):
    subtitle: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1, max_length=500)


class FortuneHighlights(BaseModel):
    elements: list[str] = Field(default_factory=list)   # e.g. ["wood", "fire"]
    ten_gods: list[str] = Field(default_factory=list)   # e.g. ["비견", "식상"]


class FortuneResult(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=2000)
    score: int = Field(ge=0, le=100)
    details: list[FortuneDetail] = Field(min_length=1, max_length=10)
    actions: list[str] = Field(min_length=1, max_length=12)
    highlights: FortuneHighlights = Field(default_factory=FortuneHighlights)


class TooltipRequest(BaseModel):
    profile_id: str = Field(min_length=1)
    terms: list[str] = Field(min_length=1, max_length=30)


class TooltipResponse(BaseModel):
    tooltips: dict[str, str]


class EventCreateRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=36)
    event_type: str = Field(min_length=1, max_length=50)
    term: str | None = Field(default=None, max_length=50)


class EventResponse(BaseModel):
    success: bool


class FeedbackCreateRequest(BaseModel):
    read_id: str = Field(min_length=1)
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)
    flag_inaccurate: bool = False


class FeedbackResponse(BaseModel):
    success: bool


class StoredProfile(BaseModel):
    profile_id: str
    input_hash: str
    payload: ProfileCreateRequest
    computed: ProfileResponse
    created_at: datetime


class StoredRead(BaseModel):
    read_id: str
    cache_key: str
    profile_id: str
    feature_type: str
    period_key: str
    result_json: dict[str, Any]
    created_at: datetime


class StoredFeedback(BaseModel):
    read_id: str
    rating: int
    comment: str | None
    flag_inaccurate: bool
    created_at: datetime

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None
