# Phase 1 — Mid-Flight Kill Test: Build Spec for Cursor

> **Goal:** Prove an audit job that is IN FLIGHT when the worker dies abruptly does NOT strand in RUNNING forever.  
> **Why:** Every Railway redeploy sends SIGTERM→SIGKILL to the worker. Once the UI drives real (slow) crawls, this is a live production scenario. Must be proven before the real crawl ships.  
> **Parent:** `aisearchrank-phase1-audit-agent.md` §11  
> **Time:** ~20 min

---

## 1. Add the test hook

In the audit task (`agent_api/worker.py` or `services/audit_agent_service.py` — wherever `run_audit` executes), add a configurable delay **after** status → RUNNING, **before** scoring:

```python
import os, asyncio

async def run_audit(ctx, job_id, site_url, client_id=None):
    await set_status(db, job_id, "RUNNING", progress=0, stage="crawling")

    # TEST-ONLY: simulate a slow crawl so we can kill mid-flight
    delay = int(os.getenv("AUDIT_TEST_DELAY_SEC", "0"))
    if delay:
        await asyncio.sleep(delay)

    # ... existing scoring / gap detection ...
```

> Default is `0` — zero impact in normal runs. Test-only when the env var is set.

---

## 2. Add the startup sweep (the actual fix)

This is the safety net that makes orphaned jobs impossible. On worker boot, reclaim any job stuck in RUNNING longer than the job timeout. Add to arq `WorkerSettings.on_startup` (or app startup):

```python
async def reclaim_stale_jobs(db):
    # Jobs still RUNNING but older than the timeout = orphaned by an abrupt death
    await db.execute("""
        UPDATE audit_jobs
        SET status = 'QUEUED', stage = 'reclaimed_after_restart', updated_at = NOW()
        WHERE status = 'RUNNING'
          AND updated_at < NOW() - INTERVAL '5 minutes'
    """)
    # (Use FAILED instead of QUEUED if you prefer manual re-trigger over auto-retry)

async def on_startup(ctx):
    ctx["db"] = make_pg_factory(os.environ["CITATION_DATABASE_URL"])
    await reclaim_stale_jobs(ctx["db"])
```

> **Design choice:** `QUEUED` = auto-recover (job re-runs). `FAILED` = visible failure, manual re-trigger. For an autonomous agent, **QUEUED is the better default** — self-healing. Pick one and note it.

---

## 2b. Threshold vs. delay (read this before running)

Default `AUDIT_STALE_JOB_SEC=300` (5 min) is correct **production** behaviour — don't reclaim genuinely-active jobs.

For the kill test, `AUDIT_TEST_DELAY_SEC=30` means a job killed at T+10s has only been `RUNNING` ~40s when the worker reboots — **under** the 5-minute threshold. The sweep won't fire on that boot; the job may look stuck until arq re-enqueues or 5 minutes pass.

**For a clean, fast read during testing:**

| Env var | Test value | Restore after |
|---------|------------|---------------|
| `AUDIT_TEST_DELAY_SEC` | `30` | `0` or remove |
| `AUDIT_STALE_JOB_SEC` | `60` | `300` |

Confirm **both** recovery paths if possible:

1. **Primary:** arq `max_tries` re-enqueues after SIGKILL (job may reach `DONE` without sweep).
2. **Backstop:** startup sweep reclaims → `QUEUED` + `reclaimed_after_restart` (watch for `[audit-worker] reclaimed N stale RUNNING job(s)` in logs).

---

## 3. Run the test

```powershell
# On the worker service — test window only
AUDIT_TEST_DELAY_SEC=30
AUDIT_STALE_JOB_SEC=60

# Enqueue an audit (real User.id for created_by)
curl -X POST https://<agent-api>.up.railway.app/agents/audit/run `
  -H "X-API-Key: $env:AGENT_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"site_url":"https://example.com","created_by":"b672f607-fee9-45c4-bd3b-9419af079fb9"}'

# Confirm it reaches RUNNING
curl https://<agent-api>.up.railway.app/agents/audit/status/<job_id> -H "X-API-Key: $env:AGENT_API_KEY"

# At ~T+10s, HARD kill the worker — SIGKILL, not graceful
#   Railway: restart the worker service from the dashboard, OR
#   local:   kill -9 <worker_pid>
```

> **Critical:** must be a HARD kill (`kill -9` / container restart), NOT SIGTERM. SIGTERM lets arq finish the job gracefully — which is exactly what hid the failure mode in the smoke test. SIGKILL simulates real container eviction.

---

## 4. Observe — three outcomes

| Outcome | Meaning | Action |
|---|---|---|
| ✅ Job re-runs after worker reboot (arq `max_tries` re-enqueue, or sweep → QUEUED → picked up) → reaches DONE | Durable. Self-healing. | None — green |
| 🟡 Job ends FAILED with state intact (no silent loss) | Acceptable — recoverable | None, or switch sweep to QUEUED for auto-retry |
| 🔴 Job stuck in RUNNING forever, no retry | The bug | The sweep (step 2) fixes it — confirm it fires on reboot |

With the startup sweep in place, 🔴 becomes impossible: even if arq doesn't re-enqueue, the next worker boot reclaims the orphan within the interval.

---

## 5. Verify the proof

```sql
-- After the kill + worker reboot, the killed job should NOT be stuck RUNNING:
SELECT id, status, stage, updated_at FROM audit_jobs ORDER BY updated_at DESC LIMIT 5;
-- Expect: the killed job is QUEUED→DONE (recovered) or FAILED — never orphaned RUNNING
```

---

## 6. Cleanup

- Set `AUDIT_TEST_DELAY_SEC=0` (or remove) after the test — test-only tooling.
- **Keep** the startup sweep — that's permanent production hardening, not test scaffolding.

---

## 7. Report back

Send: which of the three outcomes occurred, whether the sweep fired, and the final `status` of the killed job. That closes proof #4 in `phase1-audit-agent.md` §11 and makes Phase 1 backend fully green.

---

## 8. Verification status (2026-06-12)

| Path | Status |
|------|--------|
| arq primary recovery (`max_tries` re-enqueue after kill) | **Proven** — kill test 2026-06-12, `try=2` in worker logs |
| Startup sweep (`reclaimed_after_restart`) | **Proven-by-design, not proven-by-test** — arq recovered first; to test sweep: `max_tries=1` + kill mid-delay + wait past `AUDIT_STALE_JOB_SEC` |
| Worker config drift (web app on worker service) | **Fixed manually each deploy** — **dashboard action pending:** `aisearchrank-agent-worker` → Settings → Config File → `/railway.worker.toml` |

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-12 | Kill-test spec created — delay hook + startup sweep + hard-kill procedure + 3-outcome rubric |
| 2026-06-12 | Live kill test green via arq retry; sweep + worker config file logged as open/honest |
