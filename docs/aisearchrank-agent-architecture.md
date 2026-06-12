# aisearchrank.ai — Agent Architecture & Backend Hosting

> **Purpose:** Architecture for the autonomous agents managing aisearchrank.ai, plus the backend hosting plan that unblocks them.  
> **Companion docs:** `aisearchrank-deployment-log.md` · `aisearchrank-app-inventory.md`  
> **Core principles:** Rules-first (LLM optional, deterministic fallbacks) · HITL by default · One site = one DB · Never deploy without explicit ask · Smallest correct fix wins  
> **Last updated:** 2026-06-11

---

## Design Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| Backend hosting | **Railway** (both Python backends) | Long-running jobs, native Python, built-in queues, cheap |
| Frontend hosting | **Vercel** (unchanged) | Already live; keep as-is |
| Agent autonomy | **Auto reads / HITL on writes** | Matches rules-first + HITL default; reversibility line |
| First capability | **Audit + gap detection** | Pure read work, lowest risk, feeds everything else |

---

## 1. Why the Hosting Split

The deciding factor is the **Vercel 60-second function timeout**.

| Backend | Workload | Typical duration | Vercel | Verdict |
|---|---|---|---|---|
| Citation Engine | Quick source lookups | 2–10s | ✅ works | Railway anyway (Python + consistency) |
| Agent API | LLM chains, multi-step audits, fix gen | 30–180s+ | ❌ times out | **Railway / Fly required** |

An agent loop that crawls, scores, and generates fixes will routinely exceed 60s and lose state mid-job on serverless. Railway runs these as proper long-lived processes with queues and retries.

### Target topology

```
┌─────────────────────────────┐
│  Vercel  (frontend)         │
│  aisearchrank.ai            │
│  Next.js 15 · NextAuth      │
└──────────────┬──────────────┘
               │  HTTPS (env-configured URLs)
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Railway      │  │ Railway          │
│ Citation     │  │ Agent API        │
│ Engine       │  │ FastAPI + worker │
│ FastAPI      │  │ + job queue      │
│ (short)      │  │ (long-running)   │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └─────────┬─────────┘
                 ▼
       ┌───────────────────┐
       │ Supabase Postgres │  ← single source of truth
       │ (one site = one DB)│
       └───────────────────┘
```

---

## 2. Railway Deployment

### Install + login
```bash
npm install -g @railway/cli
railway login
```

### Citation Engine (short tasks)
```bash
cd citation-engine
railway init
railway up
```

### Agent API (long-running)
```bash
cd agent-api
railway init
railway up
```

### `railway.toml` (per backend)
```toml
[build]
builder = "nixpacks"

[deploy]
start = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheck = "/health"
```

> Add a `/health` endpoint to each service so Railway and the frontend can verify they're up.

### Railway env vars (per backend)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...   # from Supabase, pooled
DIRECT_URL=postgresql://...     # non-pooled, for migrations
```

### Update Vercel frontend env vars (off localhost)
```env
CITATION_ENGINE_URL=https://citation-engine.up.railway.app
AGENT_API_URL=https://agent-api.up.railway.app
```

### Mock fallback (so frontend never breaks pre-deploy)
```typescript
// lib/backend-clients.ts
const CITATION_ENGINE_URL = process.env.CITATION_ENGINE_URL || 'mock';
const AGENT_API_URL = process.env.AGENT_API_URL || 'mock';

if (AGENT_API_URL === 'mock') {
  console.warn('Agent API not configured — using mock data');
}
```

### Cost estimate

| Service | Platform | Est. cost/mo |
|---|---|---|
| Citation Engine | Railway | $5–10 |
| Agent API | Railway | $10–20 |
| Streamlit admin (8502) | Streamlit Cloud (free) or Railway | $0–5 |

---

## 3. Autonomy Model — The Reversibility Line

The single rule that governs every agent action:

> **If it's read-only and reversible → agent runs it automatically.**  
> **If it writes, publishes, or mutates client content → it goes to a human approval queue.**

| Action | Type | Autonomy |
|---|---|---|
| Crawl site / fetch pages | Read | ✅ Auto |
| Run 4-layer audit | Read | ✅ Auto |
| Detect & score gaps | Read | ✅ Auto |
| Check citations | Read | ✅ Auto |
| Generate a fix (draft) | Write (staged) | ✅ Auto-draft → ⏸ HITL to apply |
| Publish fix to client site | Mutate | ⏸ **HITL required** |
| Send client report / email | External | ⏸ **HITL required** |
| Change client settings | Mutate | ⏸ **HITL required** |

This maps directly onto the existing `/agency/clients/[id]/fixes` "runs + approval" UI — the approval queue is already half-built.

### Rules-first guarantee
Every agent capability must have a **deterministic rules-based path** that works with **zero LLM calls**. The LLM is an *enhancement layer*, never a dependency. If `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are absent or rate-limited, the agent falls back to rules and still produces a valid (if less nuanced) result. This is why the scoring pages already work offline.

---

## 4. Agent Roster (build order)

### Phase 1 — Audit Agent ⭐ FIRST
- **Job:** Crawl a site → run 4-layer audit (Discoverability, Clarity, Authority, Trust) → detect & score gaps → persist to Postgres.
- **Autonomy:** Fully auto (read-only).
- **Surfaces:** `/audit`, `/gaps`, `/agency/clients/[id]/autonomous`
- **Why first:** No approval gates, no mutation risk, and it produces the data every other agent consumes.
- **Endpoints (Agent API):**
  - `POST /agents/audit/run` → enqueue job, return `job_id`
  - `GET /agents/audit/status/{job_id}` → poll progress
  - `GET /agents/audit/result/{job_id}` → structured audit + gaps

### Phase 2 — Fix Agent
- **Job:** Take scored gaps → generate fix drafts (rules-first, LLM-enhanced) → stage in approval queue.
- **Autonomy:** Auto-draft, **HITL to apply/publish**.
- **Surfaces:** `/gaps` (Generate Fix), `/agency/clients/[id]/fixes`
- **First thing that hits the HITL queue.**

### Phase 3 — Citation Monitor Agent
- **Job:** Scheduled citation checks; alert on changes in share-of-voice / mention rate.
- **Autonomy:** Auto (read); alerts only.
- **Surfaces:** `/citation-monitor`, `/citation-intelligence`
- **Already has:** Vercel cron (Mondays 9:00 UTC) — migrate trigger to Agent API queue.

### Phase 4 — Reporting Agent
- **Job:** Generate white-label reports + monthly check-in summaries.
- **Autonomy:** Auto-draft, **HITL to send**.
- **Surfaces:** `/agency/clients/[id]/report`, `/check-in`, `/executive-summary`

---

## 5. Job Lifecycle (Agent API)

```
enqueue → queued → running → (needs_approval | done | failed)
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    approve (HITL)        reject (HITL)
                          │                   │
                          ▼                   ▼
                       applied             discarded
```

- Persist **every** state transition to Postgres (job table) — never rely on in-memory state.
- Long jobs return a `job_id` immediately; frontend polls status. No synchronous waits.
- Failed jobs retry with backoff; surface the failure reason in the UI, not a generic error.
- `needs_approval` jobs appear in the existing fixes/approval queue.

---

## 6. Guardrails Checklist (every agent must satisfy)

- [ ] Deterministic rules path exists and works with **no** LLM keys
- [ ] All writes/publishes route through the HITL approval queue
- [ ] Every job state persisted to Postgres (resumable, auditable)
- [ ] One site = one DB boundary respected (no cross-client bleed)
- [ ] `/health` endpoint returns 200 when dependencies are reachable
- [ ] Rate limiting in place (Upstash) for outbound LLM + crawl calls
- [ ] No deploy/publish action runs without explicit human approval
- [ ] Smallest-correct-fix: fix drafts are minimal, scoped, reviewable

---

## 7. Critical-Path Sequence to "All Together"

**✅ Done — infra milestone cleared**
- [x] Deploy **Citation Engine** to Railway · `/health` confirmed · `CITATION_ENGINE_URL` set in Vercel
- [x] Deploy **Agent API** to Railway · `/health` + authenticated job endpoints confirmed · `AGENT_API_URL` set in Vercel
- [x] Frontend ↔ backends wired (production env vars: `CITATION_ENGINE_*`, `AGENT_API_*`)

**✅ Done — security & persistence foundation complete**
- [x] **Rotate `AGENT_API_KEY`** ✅ Done 2026-06-12 — new 32-byte key on Railway + Vercel; old leaked key now returns 401; verified via /health 200, new key auth-passes, old key rejected
- [x] **Rotate `NEXTAUTH_SECRET`** ✅ Done 2026-06-12 — picked up in prod deploy `dpl_DAtMySFj...`; all sessions invalidated, re-auth required. **Leak check: negative** — only variable name + "copy from .env.local" appeared, never a value. Precautionary rotation; no logging path to plug, no re-rotation needed. (No OAuth console change — secret is NextAuth's own signing key, not the Google client secret.)
- [x] **Migrate citation store → Supabase Postgres** ✅ Done 2026-06-12 — GREEN. psycopg3, direct URL (5432, no pgbouncer), `prepare_threshold=None` guard. Full round-trip passed: ingest → DB read-back → `railway redeploy` → post-redeploy read returned same row + same source. **Ephemerality solved** (data lives in Supabase, survives container redeploy).
  - [x] Prisma citation tables + migration in `web/` → Supabase
  - [x] Postgres store in `citation_api` (psycopg3, `CITATION_DATABASE_URL` = direct 5432)
  - [x] Railway env set before deploy (direct URL — pooler stays on Vercel for serverless frontend)
  - [x] Deploy + verify: `/health` → `storage: postgres`; ingest 200; sources returns; post-redeploy persistence confirmed
  - [ ] *Optional later:* commit `pg_connection.py` / verify-script fixes in `my-ai-seo` (not committed per instruction)
  - [ ] *If traffic grows:* add modest `psycopg_pool` (max_size 5–10) — not needed now (1 conn/request, well under ~60 direct budget)

**⬜ Then — Phase 1 Audit Agent**
- [ ] Wire **job queue + Postgres job table** in Agent API
- [ ] Ship **Audit Agent** end-to-end (`/agents/audit/*`)
- [ ] Connect `/agency/clients/[id]/autonomous` UI to live audit jobs
- [ ] **End-to-end test:** sign in → run audit → gaps → save to Postgres

**⬜ After Phase 1**
- [ ] Ship **Phase 2 Fix Agent** into existing approval queue (UI exists; backend jobs not wired)
- [ ] Move Citation Monitor cron trigger from Vercel onto the Agent API queue
- [ ] Build missing agency routes: `/agency/clients/[id]/audit`, `/settings`
- [ ] Promote first user to ADMIN; test full agency flow

---

## Open Questions / To Confirm

- [x] ~~Confirm Agent API + Citation Engine are FastAPI~~ — both live on Railway as Python REST APIs
- [x] ~~Decide queue tech~~ — **DECIDED 2026-06-12: arq + Upstash Redis.** Matches §5 job-lifecycle (resumable, retry-able, restart-survivable); native async-FastAPI fit; one Upstash instance serves both queue + rate-limiting. Job *state of record* lives in Postgres; Redis is the transport/worker queue.
- [x] ~~Citation DB persistence~~ — **decided: migrate to Supabase Postgres** (one-DB consistency over Railway volume). In progress.
- [ ] Streamlit admin (`app_v8.py`, port 8501): still local in `my-ai-seo` — keep local, or host on Railway / Streamlit Cloud?

> **Note on Citation Engine scope:** On Railway it's the **REST API only** (ingest + sources) — not the Streamlit UI. Sources read empty until audit/competitive data exists in the DB; the app correctly falls back to rules/mock until then.

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-11 | Initial architecture artifact; Railway hosting split + Phase 1–4 agent roster |
| 2026-06-12 | Both Railway backends live + connected; infra milestone done. Reprioritised: key rotation + citation volume + Postgres verify before Phase 1. Confirmed Python REST APIs. |
| 2026-06-12 | AGENT_API_KEY rotated and verified — leaked key dead. Security item closed. |
| 2026-06-12 | NEXTAUTH_SECRET rotated (sessions invalidated). Citation persistence decided: migrate to Supabase Postgres, not Railway volume. Ordered sub-steps added (tables → store → Railway env → deploy → verify). |
| 2026-06-12 | **Citation Postgres GREEN** — psycopg3 + direct URL (5432); pgbouncer incompatibility resolved. Full round-trip passed incl. post-redeploy read; ephemerality solved. NEXTAUTH_SECRET leak check negative (precautionary rotation, no logging path to plug). Security + persistence foundation complete. Phase 1 (queue tech) is the next gate. |
| 2026-06-12 | **Queue tech locked: arq + Upstash Redis** (Postgres = state of record). Phase 1 Audit Agent blueprint created → see `aisearchrank-phase1-audit-agent.md`. |

---

*Update agent statuses and the critical-path checklist as each phase ships. Log each change with a date.*
