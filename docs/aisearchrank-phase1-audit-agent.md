# Phase 1 — Audit Agent: Implementation Blueprint

> **Purpose:** Buildable spec + code for the first autonomous agent on aisearchrank.ai.  
> **Parent doc:** `aisearchrank-agent-architecture.md`  
> **Queue:** arq + Upstash Redis · **State of record:** Supabase Postgres  
> **Autonomy:** Fully auto (read-only) — no HITL gate (Audit Agent only reads & scores)  
> **Principles:** Rules-first (LLM optional, deterministic fallback) · persist every state transition · one site = one DB · smallest correct fix  
> **Last updated:** 2026-06-12

---

## 0. What This Agent Does

Takes a target site → crawls it → runs the 4-layer audit (Discoverability, Clarity, Authority, Trust) → detects & scores gaps → persists everything to Postgres. Returns a `job_id` immediately; the caller polls for status and result.

Because it's **read-only and reversible**, it runs fully autonomously — nothing it does needs human approval. It's the data source every later agent (Fix, Citation, Reporting) consumes.

---

## 1. Architecture — Where arq Sits

```
Next.js (Vercel)                  Agent API (Railway, FastAPI)
   │  POST /agents/audit/run          │
   │ ───────────────────────────────► │  enqueue job → arq
   │  ◄─── { job_id, status:queued }  │     │
   │                                  │     ▼
   │  GET /agents/audit/status/{id}   │  Upstash Redis (queue)
   │ ───────────────────────────────► │     │
   │  ◄─── { status, progress }       │     ▼
   │                                  │  arq worker (Railway, separate process)
   │  GET /agents/audit/result/{id}   │     │  crawl → audit → score gaps
   │ ───────────────────────────────► │     │  writes state @ each step ▼
   │  ◄─── { audit, gaps }            │  Supabase Postgres (job + results)
```

**Two Railway processes share one repo:**
- **web process** — FastAPI (`uvicorn main:app`) — serves the API, enqueues jobs
- **worker process** — arq worker (`arq worker.WorkerSettings`) — runs the long jobs

Both connect to the same Upstash Redis and the same Supabase Postgres.

---

## 2. Why Postgres is the State of Record (not Redis)

Redis is the *transport* — it moves jobs to the worker. But the **source of truth for job state is Postgres**, because:
- Survives Redis eviction / Upstash free-tier limits
- Auditable history (every transition logged, queryable)
- The `/status` and `/result` endpoints read Postgres, not Redis
- Satisfies the guardrail: *persist every state transition*

Redis answers "what's queued to run." Postgres answers "what happened."

---

## 3. Job Lifecycle

```
queued → running → (done | failed)
   │         │
   │         ├─ progress updates written to Postgres as it crawls/scores
   │         │
   └─────────┴─ every transition: UPDATE audit_job SET status, progress, updated_at
```

> No `needs_approval` state here — Audit Agent is read-only. That state appears in **Phase 2 (Fix Agent)**.

---

## 4. Postgres Schema (Prisma, add to `web/`)

```prisma
model AuditJob {
  id          String   @id @default(uuid())
  siteUrl     String
  clientId    String?  // null = own-site audit; set = agency client
  status      AuditJobStatus @default(QUEUED)
  progress    Int      @default(0)   // 0–100
  stage       String?  // "crawling" | "scoring_discoverability" | ...
  error       String?
  result      Json?    // final audit + gaps payload
  createdBy   String   // user id (from session)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([createdBy])
  @@index([clientId])
  @@index([status])
}

enum AuditJobStatus {
  QUEUED
  RUNNING
  DONE
  FAILED
}
```

Migration:
```bash
cd web
npx prisma migrate dev --name add_audit_job
# then on the citation/agent side, the Python service reads the same table
```

> The Agent API (Python) reads/writes this table directly via psycopg3 — same direct-URL pattern as the citation service. **Prisma owns the schema; Python is a reader/writer client.**

---

## 5. API Endpoints (FastAPI, Agent API)

All require the `AGENT_API_KEY` bearer auth already in place.

### `POST /agents/audit/run`
```jsonc
// Request
{ "site_url": "https://example.com", "client_id": null }
// Response 202
{ "job_id": "uuid", "status": "queued" }
```

### `GET /agents/audit/status/{job_id}`
```jsonc
{ "job_id": "uuid", "status": "running", "progress": 45, "stage": "scoring_authority" }
```

### `GET /agents/audit/result/{job_id}`
```jsonc
// 200 when done
{ "job_id": "uuid", "status": "done",
  "audit": { "discoverability": 72, "clarity": 80, "authority": 61, "trust": 88 },
  "gaps": [ { "layer": "authority", "issue": "...", "severity": "high", "fix_hint": "..." } ] }
// 409 if not finished yet → caller keeps polling status
```

---

## 6. arq Worker Structure

```python
# worker.py  (runs as separate Railway process)
from arq import create_pool
from arq.connections import RedisSettings
import os

async def run_audit(ctx, job_id: str, site_url: str, client_id: str | None):
    db = ctx["db"]  # psycopg3 connection factory
    try:
        await set_status(db, job_id, "RUNNING", progress=0, stage="crawling")

        pages = await crawl(site_url)                      # read-only
        await set_status(db, job_id, "RUNNING", 25, "scoring_discoverability")

        scores = {}
        for i, layer in enumerate(["discoverability","clarity","authority","trust"]):
            scores[layer] = score_layer(layer, pages)      # RULES-FIRST; LLM optional
            await set_status(db, job_id, "RUNNING", 25 + (i+1)*15, f"scoring_{layer}")

        gaps = detect_gaps(scores, pages)                  # deterministic
        await set_result(db, job_id, scores, gaps)         # → status DONE, progress 100
    except Exception as e:
        await set_status(db, job_id, "FAILED", stage="error", error=str(e))
        raise   # arq logs + retry per WorkerSettings

class WorkerSettings:
    functions = [run_audit]
    redis_settings = RedisSettings.from_dsn(os.environ["REDIS_URL"])
    max_tries = 3            # retry transient failures
    job_timeout = 300        # 5 min ceiling per audit
    keep_result = 3600
    async def on_startup(ctx):  ctx["db"] = make_pg_factory(os.environ["CITATION_DATABASE_URL"])
    async def on_shutdown(ctx): pass
```

### Enqueue side (FastAPI):
```python
# in POST /agents/audit/run
redis = await create_pool(RedisSettings.from_dsn(os.environ["REDIS_URL"]))
job_id = str(uuid4())
await insert_audit_job(db, job_id, site_url, client_id, created_by=user_id)  # status QUEUED
await redis.enqueue_job("run_audit", job_id, site_url, client_id)
return {"job_id": job_id, "status": "queued"}
```

---

## 7. Rules-First Guarantee (non-negotiable)

`score_layer()` must return a valid score **with zero LLM calls**:

```python
def score_layer(layer: str, pages) -> int:
    base = RULES[layer](pages)          # deterministic — always runs, always valid
    if llm_available():                 # OPENAI/ANTHROPIC key present + not rate-limited
        try:
            return blend(base, llm_refine(layer, pages))
        except Exception:
            return base                 # fall back silently — never fail the job on LLM
    return base
```

If both API keys are absent, the audit still completes with rules-based scores. The LLM is enhancement, never dependency. (Same reason the existing scoring pages work offline.)

---

## 8. Railway Setup

### New env vars (Agent API + worker)
```env
REDIS_URL=rediss://...upstash.io:6379    # Upstash Redis TLS URL
CITATION_DATABASE_URL=postgresql://...:5432/postgres   # direct, reuse the citation pattern
AGENT_API_KEY=...                        # already set (rotated)
OPENAI_API_KEY=...                       # optional — rules-first works without
ANTHROPIC_API_KEY=...                    # optional
```

### Two processes (Railway service settings or `Procfile`-style)
```
web:    uvicorn main:app --host 0.0.0.0 --port $PORT
worker: arq worker.WorkerSettings
```

> On Railway: either two services from the same repo (one start command each) or a process manager. The worker needs **no public domain** — it only talks to Redis + Postgres.

### Upstash
- Create one Redis database (free tier fine to start)
- TLS endpoint (`rediss://`) → `REDIS_URL`
- Same instance later doubles for Upstash rate-limiting (already noted optional in inventory)

---

## 9. Frontend Wiring (`/agency/clients/[id]/autonomous`)

The autonomous audit UI already exists. Wire it to:
1. `POST /agents/audit/run` on "Run audit" → store `job_id`
2. Poll `GET /agents/audit/status/{job_id}` every ~2s → drive progress bar from `progress` + `stage`
3. On `done` → `GET /agents/audit/result/{job_id}` → render scores + gaps, persist to the audit/gaps tables
4. On `failed` → show `error` in the UI's voice (not a generic toast)

---

## 10. Build & Verify Checklist

- [ ] Add `AuditJob` model + migration in `web/` → push to Supabase
- [ ] Provision Upstash Redis → set `REDIS_URL` on Railway (web + worker)
- [ ] Implement `worker.py` (arq) + audit/crawl/score/gap functions
- [ ] Implement 3 endpoints (`run` / `status` / `result`) with existing bearer auth
- [ ] Add worker as a second Railway process (no public domain)
- [ ] Confirm rules-first: run an audit with **no** LLM keys → still completes green
- [ ] **End-to-end test:** sign in → trigger audit from `/agency/clients/[id]/autonomous` → poll → gaps render → saved to Postgres
- [ ] Restart-survival test: kill the worker mid-job → confirm job state in Postgres is intact and (with retry) resumes/fails cleanly — *proves Redis+Postgres durability, the arq equivalent of the citation redeploy test*

---

## 11. Verification That Actually Proves It (per project pattern)

Don't stop at "endpoint returns 200." The proofs that matter:
1. **Rules-first proof:** audit completes correctly with zero LLM keys set
2. **Persistence proof:** job + result survive a worker restart (state in Postgres, not memory)
3. **End-to-end proof:** a real audit triggered from the UI lands gaps in Postgres and renders — the "it all comes together" moment

---

## Open Questions

- [ ] Crawl depth/politeness limits — max pages per audit? robots.txt respect? (set a sane default cap)
- [ ] One Upstash instance for queue + rate-limiting, or separate? (start shared)
- [ ] Worker concurrency — how many audits run in parallel? (start with 1–2 on free tier)

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-12 | Initial Phase 1 blueprint — arq + Upstash Redis locked; schema, endpoints, worker, rules-first, Railway setup, verification plan |

---

*This is the buildable spec. Claude scopes & writes; you deploy & verify green (same pattern as citation Postgres). Update statuses as each checklist item lands.*
