from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI(title="Saju Hub API", version="0.1.0")

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
