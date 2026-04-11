# Stage 1: Build Next.js frontend
FROM node:20-slim AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
# API calls use relative path (same origin) in production
ENV NEXT_PUBLIC_API_BASE_URL=""
RUN npm run build


# Stage 2: Python runtime (FastAPI + static files)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/app ./app
COPY --from=frontend-builder /frontend/out ./out

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
