# 사주

설명형 사주 풀이 웹앱. 결과만 주는 게 아니라 왜 그런지 같이 읽을 수 있습니다.

## 스택

- **Frontend**: Next.js (App Router, 정적 빌드)
- **Backend**: FastAPI + SQLAlchemy
- **LLM**: Gemini 2.5 Flash
- **DB**: PostgreSQL

## 로컬 개발

```bash
# 백엔드
cd backend
uv sync
CORS_ORIGINS=http://localhost:3000 GEMINI_API_KEY=... uv run uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm install
npm run dev
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 Docker 이미지를 빌드해 Render에 자동 배포합니다.

환경변수 (Render):
- `DATABASE_URL`
- `GEMINI_API_KEY`
