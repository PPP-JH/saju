#!/bin/sh
set -e

# FastAPI on internal port 3001
uv run uvicorn app.main:app --host 127.0.0.1 --port 3001 &

# Next.js standalone server on public port 8000
exec env PORT=8000 HOSTNAME=0.0.0.0 node frontend/server.js
