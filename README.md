# AI Search OS

An operating system for **AI-driven search visibility** — GEO/AEO workflows that connect GSC, SERP, competitive audit, AI Answer Hub, editorial pipeline, and agent jobs.

This is the **starter project**: runnable scaffold with rules-first services, a Streamlit shell, agent worker, and extension points for the full Citation Engine feature set.

## Quick start

### Web UI (npm — this project's primary dev surface)

```powershell
cd D:\Dev\ai-search-os
npm install
npm run dev
```

Open **http://localhost:3000**. This is separate from all other projects.

### Python admin (Streamlit — optional backend shell)

```powershell
cd D:\Dev\ai-search-os
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python scripts\site_init.py --site demo
python scripts\doctor.py
.\scripts\dev.ps1
```

Open **http://localhost:8502**. Citation Engine (`my-ai-seo`) keeps **8501** so all three can run side by side:

| Project | Port |
|---------|------|
| Citation Engine | 8501 |
| AI Search OS (Python) | 8502 |
| AI Search OS (npm web) | 3000 |

Optional: set `SERPAPI_KEY` in `.env` for live multi-engine intent.

## Architecture

```
config/          Site registry + module map
contracts/       Pydantic models (agentic OS, editorial)
core/            Settings, env bootstrap, site context
db/              SQLite migrations
services/        Business logic (no UI imports)
agents/          Background graph dispatch
ui/              Streamlit screens
cli/             Headless commands
scripts/         Doctor, site init, agent worker
docs/            Architecture + roadmap
```

## Golden path

1. **AI Answer Hub** — run keyword intent, get unified must-answer list
2. **Opportunities** — create gap → **Fill gap** → brief with FAQs
3. **Agent Jobs** — `python scripts\agent_worker.py` processes queued graphs

## CLI

```powershell
python -m cli.ai_answer -k "best home espresso machine" --save
python scripts\agent_worker.py
```

## Multi-site

Edit `config/sites_registry.json`, then:

```powershell
python scripts\site_init.py --site your_site_id
```

One site = one SQLite file. Switch sites in the Streamlit sidebar.

## Principles

- **Rules first, LLM optional** — works offline; API keys upgrade quality
- **HITL by default** — humans approve before publish
- **Agentic between layers** — strategy, brief synthesis, refresh (see `docs/ROADMAP.md`)

## Related

Evolved from the Citation Engine (`my-ai-seo`) architecture. This repo is the clean greenfield starter; migrate features incrementally from the production codebase.

## License

MIT
