# AI Search OS — agent instructions

You are working in **AI Search OS**, an operating system for AI-driven search visibility (GEO/AEO).

## Principles

1. **Rules first, LLM optional** — every workflow must run offline with deterministic fallbacks.
2. **HITL by default** — strategy updates gap reasoning; publish stays dry-run until explicitly enabled.
3. **One site = one SQLite DB** — never cross-contaminate WordPress credentials or gaps between sites.
4. **Reuse existing data** — GSC, SERP, competitive audit, and AI Answer Hub feed one editorial pipeline.

## Architecture

| Layer | Path | Role |
|-------|------|------|
| Contracts | `contracts/` | Pydantic models for agentic OS and editorial |
| Services | `services/` | Business logic (no UI imports) |
| Agents | `agents/` | Graph dispatch for background jobs |
| UI | `ui/` | Streamlit screens |
| CLI | `cli/` | Headless commands |
| DB | `db/` | SQLite migrations |

## Golden path

1. Register site → `python scripts/site_init.py --site demo`
2. Run doctor → `python scripts/doctor.py`
3. Start app → `.\scripts\dev.ps1` (port 8502)
4. AI Answer Hub → keyword intent → Opportunities gap → Brief → Draft → QA

## Citation Engine integration (my-ai-seo)

Two repos work together. Set matching `AGENT_API_KEY` in both `web/.env.local` and ai-search-os `.env.local`.

| Service | Repo | Port | Command |
|---------|------|------|---------|
| Next.js web | ai-search-os | **3000** | `npm run dev` (from `web/`) |
| Agent API | ai-search-os | **8787** | `python -m agent_api` or `.\scripts\agent_api.ps1` |
| Streamlit admin | ai-search-os | **8502** | `.\scripts\dev.ps1` |
| Citation REST API | my-ai-seo | **8510** | `cd d:\Dev\my-ai-seo; python -m citation_api` |
| Citation Streamlit UI | my-ai-seo | **8501** | `streamlit run app_v8.py` |

Web env (`web/.env.local`):

- `CITATION_ENGINE_ENABLED=true` + `CITATION_ENGINE_URL=http://localhost:8510` — content ingest + sources
- `AGENT_API_ENABLED=true` + `AGENT_API_URL=http://localhost:8787` + `AGENT_API_KEY` — content + outreach jobs

Push order: Agent API first (`POST /jobs/content/create`, `POST /jobs/outreach/create`), then Citation REST (`POST /api/content/ingest`).

Quick start both repos: `.\scripts\dev_integration.ps1`

## Commands

```powershell
npm install && npm run dev          # web UI → http://localhost:3000
python scripts/doctor.py
python scripts/site_init.py --site demo
python scripts/agent_worker.py
.\scripts\dev.ps1                   # Streamlit admin → http://localhost:8502
.\scripts\agent_api.ps1             # Agent API → http://localhost:8787
python -m cli.ai_answer -k "best home espresso machine"
python -m pytest tests/ -q
```

Ports: npm web **3000**, Agent API **8787**, Python admin **8502**, Citation REST **8510**, Citation Streamlit **8501** (my-ai-seo).

## Do not

- Commit `.env`, credentials, or `*.db` files
- Import Streamlit inside `services/` or `db/`
- Add LLM calls without a rules-only fallback path
