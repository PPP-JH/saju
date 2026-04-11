from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from .db import init_db
from .llm import narrator
from .models import (
    EventCreateRequest,
    EventResponse,
    FeedbackCreateRequest,
    FeedbackResponse,
    ProfileCreateRequest,
    ProfileCreateResponse,
    ProfileResponse,
    ReadCreateRequest,
    ReadCreateResponse,
    ReadResponse,
    TooltipRequest,
    TooltipResponse,
)
from .services import store

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Saju Hub API", version="0.1.0", lifespan=lifespan)

_DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
_cors_raw = os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _chunk_text(text: str, chunk_size: int = 24) -> list[str]:
    if not text:
        return []
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


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
    logger.info(
        "Read stream requested: profile_id=%s feature_type=%s period_key=%s",
        payload.profile_id,
        payload.feature_type,
        payload.period_key,
    )
    bundle = store.get_profile_bundle(payload.profile_id)
    if bundle is None:
        logger.warning(
            "Read stream profile missing: profile_id=%s feature_type=%s period_key=%s",
            payload.profile_id,
            payload.feature_type,
            payload.period_key,
        )
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
            logger.info(
                "Read stream cache hit: read_id=%s feature_type=%s period_key=%s",
                cached_read.read_id,
                cached_read.feature_type,
                cached_read.period_key,
            )
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
        has_delta = False
        sep = narrator._NARRATIVE_SEP
        _TITLE_START = "[TITLE]"
        _TITLE_END = "[/TITLE]"
        title_emitted = False   # title SSE event already sent
        narrative_start = 0     # index in raw_text where narrative begins (after title line)
        narrative_yielded = 0   # chars of raw_text already sent to frontend
        narrative_done = False  # separator has been seen

        try:
            async for delta in narrator.stream_result_text(
                profile=profile,
                feature_type=payload.feature_type,
                period_key=payload.period_key,
            ):
                raw_text += delta
                has_delta = True

                if not title_emitted:
                    # Buffer until we see [/TITLE]
                    if _TITLE_END in raw_text:
                        title_emitted = True
                        ts = raw_text.find(_TITLE_START)
                        te = raw_text.find(_TITLE_END)
                        if ts != -1:
                            title_text = raw_text[ts + len(_TITLE_START):te]
                            yield _to_sse(event="title", data={"text": title_text.strip()})
                        # Narrative starts after [/TITLE]\n
                        after_title = raw_text[te + len(_TITLE_END):]
                        narrative_start = len(raw_text) - len(after_title.lstrip("\n"))
                        narrative_yielded = narrative_start
                elif not narrative_done:
                    if sep in raw_text:
                        # Separator found — yield anything before it not yet sent
                        narrative_done = True
                        sep_pos = raw_text.index(sep)
                        to_yield = raw_text[narrative_yielded:sep_pos]
                        if to_yield:
                            yield _to_sse(event="delta", data={"text": to_yield})
                        narrative_yielded = len(raw_text)
                    else:
                        # No separator yet — safe to yield up to len - len(sep)
                        # to avoid partial separator leaking
                        safe_end = max(narrative_yielded, len(raw_text) - len(sep))
                        if safe_end > narrative_yielded:
                            to_yield = raw_text[narrative_yielded:safe_end]
                            if to_yield:
                                yield _to_sse(event="delta", data={"text": to_yield})
                            narrative_yielded = safe_end
                # After narrative_done: don't yield (it's JSON)
        except Exception:
            logger.exception(
                "Read stream narration iteration failed: profile_id=%s feature_type=%s period_key=%s",
                payload.profile_id,
                payload.feature_type,
                payload.period_key,
            )
            raw_text = ""
            has_delta = False

        parsed = narrator.parse_result_text(raw_text) if raw_text else None
        final_result = parsed or fallback_json

        # Store the narrative prose as summary so cache-hit fake-stream works for all types
        if raw_text and narrator._NARRATIVE_SEP in raw_text:
            full_narrative = raw_text.split(narrator._NARRATIVE_SEP, 1)[0]
            # Strip [TITLE]...[/TITLE] line from narrative before storing
            _te = full_narrative.find("[/TITLE]")
            narrative = full_narrative[_te + len("[/TITLE]"):].strip() if _te != -1 else full_narrative.strip()
            if narrative and final_result:
                final_result = {**final_result, "summary": narrative}

        # If LLM stream yielded nothing, still stream fallback narration chunks so UI doesn't stay empty.
        if not has_delta:
            fallback_text = " ".join(
                [
                    str(final_result.get("summary", "")),
                    " ".join(
                        item.get("content", "")
                        for item in final_result.get("details", [])
                        if isinstance(item, dict)
                    ),
                ]
            ).strip()
            logger.warning(
                "Read stream no llm delta, using fallback chunks: profile_id=%s feature_type=%s period_key=%s",
                payload.profile_id,
                payload.feature_type,
                payload.period_key,
            )
            for chunk in _chunk_text(fallback_text):
                yield _to_sse(event="delta", data={"text": chunk})

        try:
            read_id, cached = store.create_or_get_read_from_result(
                profile_id=payload.profile_id,
                feature_type=payload.feature_type,
                period_key=payload.period_key,
                result_json=final_result,
            )
        except KeyError:
            logger.error(
                "Read stream persist failed: profile_id=%s feature_type=%s period_key=%s",
                payload.profile_id,
                payload.feature_type,
                payload.period_key,
            )
            yield _to_sse(event="error", data={"detail": "profile not found"})
            return

        persisted = store.get_read(read_id)
        result_json = persisted.result_json if persisted else final_result
        logger.info(
            "Read stream done: read_id=%s cached=%s feature_type=%s period_key=%s",
            read_id,
            cached,
            payload.feature_type,
            payload.period_key,
        )
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


@app.post("/api/tooltips", response_model=TooltipResponse)
async def get_tooltips(payload: TooltipRequest) -> TooltipResponse:
    try:
        tooltips = store.get_or_create_tooltips(
            profile_id=payload.profile_id,
            terms=payload.terms,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="profile not found") from None
    return TooltipResponse(tooltips=tooltips)


@app.post("/api/events", response_model=EventResponse)
async def log_event(payload: EventCreateRequest) -> EventResponse:
    store.log_event(payload)
    return EventResponse(success=True)


@app.post("/api/feedback", response_model=FeedbackResponse)
async def submit_feedback(payload: FeedbackCreateRequest) -> FeedbackResponse:
    try:
        store.add_feedback(payload)
    except KeyError:
        raise HTTPException(status_code=404, detail="read not found") from None
    return FeedbackResponse(success=True)


# ── Frontend static file serving ──────────────────────────────────────────────
# Serves the Next.js static export (out/) that is copied into the container.
# Falls back to the route's .html file, then index.html for unknown paths.

_STATIC_DIR = Path(__file__).parent.parent / "out"


@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str) -> FileResponse:
    if not _STATIC_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend not built")

    # Exact file match (_next/static/**, favicon.ico, etc.)
    candidate = _STATIC_DIR / full_path
    if candidate.is_file():
        return FileResponse(candidate)

    # Route with .html extension (/saju → out/saju.html)
    html_candidate = _STATIC_DIR / f"{full_path}.html"
    if html_candidate.is_file():
        return FileResponse(html_candidate)

    # Root path or unknown → index.html
    return FileResponse(_STATIC_DIR / "index.html")
