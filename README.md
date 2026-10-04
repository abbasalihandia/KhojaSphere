# KhojaSphere — frontend + backend (incremental build, milestone 1)

```
KhojaSphere/
├── frontend/   React 19 + Vite + Tailwind (your original UI, now partly wired to the API)
├── backend/    FastAPI + SQLAlchemy + Alembic (SQLite or PostgreSQL), optional Ollama AI
└── docker-compose.yml   optional PostgreSQL
```

> **Status:** this is milestone 1. See `STATUS.md` for exactly what works, what is partial and what is still pending.

## Run it (SQLite, no Docker needed)

**Prerequisites:** Python 3.11+ and Node 20+ (pnpm or npm).

```bash
# 1) Backend  (terminal 1)
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # Windows: copy .env.example .env
#   -> open .env and set JWT_SECRET (any long random string for local dev)
alembic upgrade head                 # creates the tables
python -m seed.seed                  # sample data; PRINTS generated admin/demo passwords once
uvicorn app.main:app --reload --port 8000
#   API docs: http://localhost:8000/docs

# 2) Frontend  (terminal 2)
cd frontend
cp .env.example .env                 # Windows: copy .env.example .env
pnpm install                         # or: npm install
pnpm dev                             # or: npm run dev     -> http://localhost:8443
```

Sign in with `admin@khojasphere.example` or `demo.owner@khojasphere.example` (passwords were printed by the seed
script; set `ADMIN_PASSWORD` / `SEED_PASSWORD` in `backend/.env` before seeding to choose your own). Or just register.

To rebuild sample data: `python -m seed.seed --reset`.

### PostgreSQL instead of SQLite
```bash
docker compose up -d db
# backend/.env:  DATABASE_URL=postgresql://khoja:khoja@localhost:5432/khojasphere
alembic upgrade head && python -m seed.seed
```

### Optional AI (Ollama)
The app works fully without it (rule-based smart search / drafts). To enable LLM features:
```bash
ollama pull llama3.2:3b          # chat / query understanding / listing drafts  (~2 GB)
ollama pull nomic-embed-text     # semantic search embeddings                   (~275 MB)
ollama serve                     # if it is not already running
```
Then restart the backend and run `python -m seed.seed` (or `POST /api/admin/reindex`) to build the semantic index.
Check `GET http://localhost:8000/api/ai/status`. Use `OLLAMA_MODEL=` to choose another model.

### Tests
```bash
cd backend && pip install -r requirements-dev.txt && pytest -q      # 65 tests
cd frontend && npx tsc --noEmit && npx vite build
```

## Troubleshooting
* **"Can't reach the KhojaSphere server"** in the UI → backend not running, or `VITE_API_URL` is wrong.
* **CORS error in the browser console** → add your frontend origin to `FRONTEND_URL` in `backend/.env` and restart.
* **Logged out after every backend restart** → set a fixed `JWT_SECRET` in `backend/.env`.
* **`alembic` can't find the database** → run it from the `backend/` folder with the virtualenv active.
* **Images don't show** → `BACKEND_URL` must be the URL your browser uses to reach the backend.
