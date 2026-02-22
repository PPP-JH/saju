from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .db import init_db
from .llm import narrator
from .models import (
    FeedbackCreateRequest,
    FeedbackResponse,
    ProfileCreateRequest,
    ProfileCreateResponse,
    ProfileResponse,
    ReadCreateRequest,
    ReadCreateResponse,
    ReadResponse,
)
from .services import store


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Saju Hub API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/profile", response_model=ProfileCreateResponse)
async def create_profile(payload: ProfileCreateRequest) -> ProfileCreateResponse:
    profile_id, _ = store.create_or_get_profile(payload)
    return ProfileCreateResponse(profile_id=profile_id)


@app.get("/api/profile/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: str) -> ProfileResponse:
    profile = store.get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return profile


@app.post("/api/read", response_model=ReadCreateResponse)
async def create_read(payload: ReadCreateRequest) -> ReadCreateResponse:
    try:
        read_id, cached = store.create_or_get_read(
            profile_id=payload.profile_id,
            feature_type=payload.feature_type,
            period_key=payload.period_key,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="profile not found") from None

    return ReadCreateResponse(read_id=read_id, cached=cached)


@app.post("/api/read/stream")
async def stream_read(payload: ReadCreateRequest) -> StreamingResponse:
    bundle = store.get_profile_bundle(payload.profile_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="profile not found")

    profile, input_hash = bundle
    cached_read = store.get_cached_read(
        input_hash=input_hash,
        feature_type=payload.feature_type,
        period_key=payload.period_key,
    )

    fallback_json = store.build_fallback_result(
        profile=profile,
        feature_type=payload.feature_type,
        period_key=payload.period_key,
        input_hash=input_hash,
    )

    async def stream_events() -> AsyncIterator[str]:
        if cached_read is not None:
            yield _to_sse(
                event="done",
                data={
                    "read_id": cached_read.read_id,
                    "cached": True,
                    "feature_type": cached_read.feature_type,
                    "period_key": cached_read.period_key,
                    "result_json": cached_read.result_json,
                },
            )
            return

        raw_text = ""
        try:
            async for delta in narrator.stream_result_text(
                profile=profile,
                feature_type=payload.feature_type,
                period_key=payload.period_key,
            ):
                raw_text += delta
                yield _to_sse(event="delta", data={"text": delta})
        except Exception:
            raw_text = ""

        parsed = narrator.parse_result_text(raw_text) if raw_text else None
        final_result = parsed or fallback_json

        try:
            read_id, cached = store.create_or_get_read_from_result(
                profile_id=payload.profile_id,
                feature_type=payload.feature_type,
                period_key=payload.period_key,
                result_json=final_result,
            )
        except KeyError:
            yield _to_sse(event="error", data={"detail": "profile not found"})
            return

        persisted = store.get_read(read_id)
        result_json = persisted.result_json if persisted else final_result
        yield _to_sse(
            event="done",
            data={
                "read_id": read_id,
                "cached": cached,
                "feature_type": payload.feature_type,
                "period_key": payload.period_key,
                "result_json": result_json,
            },
        )

    return StreamingResponse(stream_events(), media_type="text/event-stream")


@app.get("/api/read/{read_id}", response_model=ReadResponse)
async def get_read(read_id: str) -> ReadResponse:
    read = store.get_read(read_id)
    if read is None:
        raise HTTPException(status_code=404, detail="read not found")
    return read


@app.post("/api/feedback", response_model=FeedbackResponse)
async def submit_feedback(payload: FeedbackCreateRequest) -> FeedbackResponse:
    try:
        store.add_feedback(payload)
    except KeyError:
        raise HTTPException(status_code=404, detail="read not found") from None
    return FeedbackResponse(success=True)
