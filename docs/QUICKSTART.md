# Quickstart

## 1. Web UI (npm — primary dev surface)

```powershell
cd D:\Dev\ai-search-os
npm install
npm run dev
```

Open **http://localhost:3000**. Separate from Citation Engine (8501) and Python admin (8502).

If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, your network may be intercepting HTTPS. Try once:

```powershell
npm config set strict-ssl false
npm install
```

## 2. Python admin (optional)

```powershell
cd D:\Dev\ai-search-os
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

## 2. Initialize demo site

```powershell
python scripts\site_init.py --site demo
python scripts\doctor.py
```

Expected: `doctor: OK`

## 3. Run the app

```powershell
.\scripts\dev.ps1
```

Or double-click `Start-AISearchOS.bat`. Plain `streamlit run app.py` also uses port **8502** via `.streamlit/config.toml`.

Open **http://localhost:8502**. If you also run Citation Engine (`my-ai-seo`), leave that on **8501**.

## 4. First workflow

1. Open **AI Answer Hub**
2. Enter a keyword → **Run intent**
3. Open **Opportunities** → create or fill a gap
4. Optional: queue a research job from the Hub

## 5. Background worker

```powershell
python scripts\agent_worker.py
```

## Optional API keys

| Key | Purpose |
|-----|---------|
| `SERPAPI_KEY` | Live Google/Bing/DuckDuckGo intent |
| `OPENAI_API_KEY` | Future LLM upgrades (not required in starter) |

Without keys, rules-mode generates sensible must-answer seeds offline.
