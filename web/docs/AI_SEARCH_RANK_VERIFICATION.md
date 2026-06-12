# AI Search Rank — verification & remaining setup

Status after investigation (2025-06-12). Most workflow pieces were already implemented; this doc covers manual steps and E2E proof.

## What already exists

| Area | Status |
|------|--------|
| `/api/user/plan` + `/api/user/tier` | Both routes map `PlanType` → tier via `resolveUserTierFromPlanType` + `getSession` |
| `Gap` Prisma model | `clientId`-scoped with `auditId`, `fixGenerated`, `sourceData` |
| Migrations | `20250611120000_workflow_persistence` (+ earlier agency schema) — DB up to date |
| `/api/gaps` GET/POST | `requireWorkflowContext`, `dbGapToUiGap` / `uiGapToDbFields` |
| `GapDashboard` | `fetchGaps` / `persistGaps` from `workflow-api.ts`; detects + persists on audit |
| `useAgentFix` | Hook + `/api/fix/agent/run` — wired in GapDashboard for signed-in users |

## Task 1: Upstash Redis (manual — CLI auth blocked)

**Current state:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are **not** in `web/.env.local` or Vercel production. `npx @upstash/cli auth whoami` returns *"You are not logged in"* (interactive login required).

Without Redis, abuse tracking and rate limiting fall back to Prisma / in-memory (works, but edge middleware cannot use Prisma for free-audit IP limits).

### Provision Upstash Redis

1. Sign in at [console.upstash.com](https://console.upstash.com) (or run `npx @upstash/cli auth login` in an interactive terminal).
2. Create a **Global** Redis database (REST API enabled).
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** from the database details page.

### Local (`web/.env.local` — do not commit)

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

### Vercel production

From `web/` (PowerShell; set `NODE_TLS_REJECT_UNAUTHORIZED=0` on Windows if TLS errors):

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
npx vercel env add UPSTASH_REDIS_REST_URL production
npx vercel env add UPSTASH_REDIS_REST_TOKEN production
npx vercel --prod
```

Or paste values in Vercel → Project → Settings → Environment Variables (Production + Preview).

### Verify Redis

```powershell
cd web
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
node -e "const { Redis } = require('@upstash/redis'); const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }); r.set('ping','pong',{ex:60}).then(() => r.get('ping')).then(console.log)"
```

## Task 2: `/api/user/plan` smoke test

```bash
# Unauthenticated → free tier
curl -s https://ai-search-os-web.vercel.app/api/user/plan

# Signed in (browser session cookie) → starter/pro/agency/enterprise from subscription
curl -s -b "next-auth.session-token=..." https://ai-search-os-web.vercel.app/api/user/plan
```

Expected shape: `{ "tier": "free"|"starter"|"pro"|"agency"|"enterprise", "plan": "FREE"|..., "domainLimit": N }`.

## Task 3–4: Gaps persistence

No new migration required. Schema matches `web/prisma/schema.prisma` `Gap` model.

**API contract:**

- `GET /api/gaps?auditId=<uuid>` — client-scoped gaps (session + approved user)
- `POST /api/gaps` — `{ auditId?, gaps: Gap[], replace?: boolean }`

## Task 5: Signed-in E2E proof (automatable checklist)

Prerequisites: `DATABASE_URL`, NextAuth (`GOOGLE_CLIENT_*` or `DEV_AUTH_BYPASS=true` locally), optional `AGENT_API_*`.

1. **Sign in** — `/auth/signin` or dev bypass (`DEV_AUTH_BYPASS=true`).
2. **Run audit** — `/audit`, enter domain, complete at least one layer so gap detection has signal.
3. **Open gaps** — `/gaps`; dashboard loads persisted gaps via `GET /api/gaps` when authenticated.
4. **Refresh** — gaps remain (Postgres, not localStorage-only).
5. **DB check** (optional):

   ```sql
   SELECT id, "clientId", "auditId", title, severity, status FROM "Gap" ORDER BY "createdAt" DESC LIMIT 10;
   ```

6. **Agent API smoke** (optional, signed-in):

   ```bash
   curl -s -X POST http://localhost:3000/api/fix/agent/run \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=..." \
     -d '{"domain":"example.com","gaps":[{"layer":"authority","issue":"test","severity":"medium","fix_hint":""}]}'
   ```

## Verification checklist

- [ ] Upstash vars on Vercel production (manual)
- [x] `/api/user/plan` returns tier
- [x] Gaps persist after audit (code path via `persistGaps`)
- [x] GapDashboard reads real data (`fetchGaps`)
- [ ] `vercel --prod` after Upstash env add (manual)
