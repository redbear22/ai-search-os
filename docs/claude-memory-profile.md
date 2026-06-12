# Claude Memory Profile — Aaron / AI Search OS

> **How to use:** Paste this into a new Claude conversation and say: *"Please remember all of this as my persistent context. Update your memory with these preferences, projects, and working style."*  
> Also add to **Settings → Privacy → Memory preferences** and create a Claude **Project** named "AI Search OS" with this file attached.

---

## About me

- **Name:** Aaron
- **Email (primary / admin):** redbearseoservices@gmail.com
- **GitHub:** redbear22
- **Role:** Founder / builder of an SEO & AI-search visibility platform
- **Business focus:** GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization) — helping sites get cited and ranked in AI answers (ChatGPT, Perplexity, Google AI Overviews, etc.)
- **Technical level:** Hands-on builder — comfortable with Next.js, React, TypeScript, Python, PostgreSQL/Supabase, Vercel, Google OAuth, and DevOps basics. I use AI heavily for development but I review and deploy myself.
- **Environment:** Windows 11, PowerShell, repo at `d:\Dev\ai-search-os`
- **AI workflow history:** I have been using **DeepSeek** heavily for project creation and development of **aisearchrank.ai** and found it very effective. I am now moving to **Claude directly** (claude.ai / Claude Pro) for strategy, architecture, and development support — skipping the middle layer.
- **Also use:** **Cursor** IDE with AI agents for in-repo coding, commits, and deployments

---

## Communication preferences (always apply)

- Lead with a **short summary**, then details if needed
- Use **clear structure** (headers, bullets) — write like a good technical blog post, not telegraphic shorthand
- **Plain language** over jargon unless we're deep in code
- When something is broken: say **what failed, why, and the exact next step**
- **Do not** commit, push, or deploy unless I explicitly ask
- **Do not** over-engineer — smallest correct fix wins
- **Do not** add LLM calls without a rules-only offline fallback (this is a core product principle)
- Prefer **actionable commands** I can run in PowerShell
- Avoid engagement bait at the end of responses

---

## Primary product: AI Search OS / AI Search Rank

**What it is:** An operating system for **AI-driven search visibility** — a B2B SaaS platform for agencies and SEO professionals to audit, monitor, and improve how brands appear in AI-generated answers.

**Public brand / production URL:** https://www.aisearchrank.ai  
**GitHub repo:** redbear22/ai-search-os (monorepo)

### Value proposition

- Unifies **GSC, SERP, competitive audit, AI Answer Hub, citation intelligence, and editorial pipeline** into one workflow
- **Rules first, LLM optional** — every workflow must run offline with deterministic fallbacks
- **HITL by default** — human-in-the-loop for strategy; publishing stays dry-run until explicitly enabled
- **Agency multi-tenant model** — agencies manage multiple clients with branding, teams, reports, and portals

### Target users

1. **Agency owners / SEO consultants** — manage multiple client sites
2. **In-house marketing teams** — track AI visibility and content gaps
3. **Admins** — approve users, manage env, view analytics

---

## Repository architecture

Monorepo at `d:\Dev\ai-search-os`:

| Layer | Path | Role |
|-------|------|------|
| **Next.js web app** | `web/` | Primary product UI (production SaaS) |
| Contracts | `contracts/` | Pydantic models |
| Services | `services/` | Business logic (no UI imports) |
| Agents | `agents/` | Background job graph dispatch |
| Streamlit admin | `ui/` | Python admin shell |
| CLI | `cli/` | Headless commands |
| DB (Python sites) | `db/` | Per-site SQLite migrations |
| Scripts | `scripts/` | Doctor, site init, agent worker |

### Sister repo: Citation Engine (`my-ai-seo`)

Located at `d:\Dev\my-ai-seo`. Works **alongside** ai-search-os:

| Service | Repo | Port |
|---------|------|------|
| Next.js web | ai-search-os | **3000** |
| Agent API | ai-search-os | **8787** |
| Streamlit admin | ai-search-os | **8502** |
| Citation REST API | my-ai-seo | **8510** |
| Citation Streamlit UI | my-ai-seo | **8501** |

Integration env in `web/.env.local`:
- `CITATION_ENGINE_ENABLED=true` + `CITATION_ENGINE_URL=http://localhost:8510`
- `AGENT_API_ENABLED=true` + `AGENT_API_URL=http://localhost:8787` + `AGENT_API_KEY`

Push order for content jobs: Agent API first, then Citation REST ingest.

---

## Web app (`web/`) — production stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router + Pages API for NextAuth) |
| UI | React 19, Tailwind, shadcn/ui, Recharts |
| Auth | NextAuth v4, Google OAuth, **JWT sessions** |
| Database | **Supabase PostgreSQL** via Prisma |
| Hosting | **Vercel** — project name: `ai-search-os-web` |
| Domain | www.aisearchrank.ai, aisearchrank.ai |

### Auth model (important)

- Sign-in is **invite-only / pre-approved**
- User email must exist in the `User` table with role **APPROVED** or **ADMIN** before Google OAuth succeeds
- Admin email: `redbearseoservices@gmail.com` (ADMIN)
- Seed command: `npx tsx web/scripts/seed-approved-user.ts <email> ADMIN`
- Auth lookup uses **Supabase REST API** on Vercel (Prisma pooler can fail on serverless)
- Gmail addresses are normalized (dots/plus-tags) before lookup

### Key auth files

- `web/lib/auth.ts` — NextAuth config, signIn/jwt callbacks
- `web/lib/auth-user-lookup.ts` — Supabase + Prisma user lookup
- `web/lib/prisma.ts` — DB URL resolution (falls back to POSTGRES_PRISMA_URL on Vercel)
- `web/pages/api/auth/[...nextauth].ts` — NextAuth handler
- `web/app/auth/signin/page.tsx` — Sign-in UI

### Supabase

- Project ref: `zvnugrlneqtgzqealuyj` (region: aws-1-us-west-1)
- Local dev: session pooler port **5432** for `prisma db push`
- Vercel production: transaction pooler port **6543** with `pgbouncer=true`

### Vercel

- **Keep only one project:** `ai-search-os-web` (deleted duplicate `ai-search-os-web-awr3`)
- Env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, plus Supabase integration vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`)
- `NEXTAUTH_URL` must be `https://www.aisearchrank.ai`

---

## Major product features (web app routes)

| Feature | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/dashboard` | Main workspace home |
| Unified audit | `/audit` | Discoverability, clarity, authority, trust layers |
| Executive summary | `/executive-summary` | High-level audit rollup |
| Gaps | `/gaps` | Content gap detection + fix generation |
| Citation intelligence | `/citation-intelligence` | AI citation monitoring |
| Citation monitor | `/citation-monitor` | Scheduled citation checks |
| AI readiness | `/ai-readiness` | AI visibility scoring |
| Agent readiness | `/agent-readiness` | Agent/crawler readiness |
| Entity trust | `/entity-trust` | Entity/knowledge graph trust |
| Zero-click visibility | `/zero-click-visibility` | SERP zero-click analysis |
| AI comparison | `/ai-comparison` | Multi-model answer comparison |
| Google I/O 2026 | `/google-io-2026` | Google AI search readiness |
| Action plan | `/action-plan` | Prioritized recommendations |
| KPIs | `/kpis` | Performance metrics |
| Tasks | `/tasks` | Task management |
| Agency hub | `/agency` | Multi-client agency dashboard |
| Agency clients | `/agency/clients/[id]` | Per-client workspace |
| Client portal | `/portal/[accessKey]` | White-label client view |
| Admin users | `/admin/users` | User approval management |
| Admin env check | `/admin/env-check` | Environment diagnostics |

### Agency features

- Multi-client management, team roles, branding, white-label reports
- ROI tracking, health scores, autonomous audit pipelines
- API keys, webhooks, OAuth clients (v1 API)
- Intelligence network (cross-client benchmarks)

### Data pillars (audit framework)

1. **Discoverability** — SERP, keywords, trends
2. **Clarity** — AI answer quality across ChatGPT, Claude, Gemini, Perplexity
3. **Authority** — citations, backlinks, competitive sources
4. **Trust** — entity trust, E-E-A-T signals

---

## Python / backend golden path

```powershell
# Register a site (per-site SQLite for Python pipeline)
python scripts/site_init.py --site demo
python scripts/doctor.py
.\scripts\dev.ps1                    # Streamlit → :8502
python scripts/agent_worker.py       # Background jobs
python -m cli.ai_answer -k "best home espresso machine"
python -m pytest tests/ -q
```

Editorial pipeline: **AI Answer Hub → keyword intent → Opportunities gap → Brief → Draft → QA**

---

## Core principles (never violate)

1. **Rules first, LLM optional** — deterministic fallbacks always
2. **HITL by default** — strategy needs human review; publish is dry-run until enabled
3. **One site = one database** — never cross-contaminate credentials or data between sites
4. **Reuse existing data** — GSC, SERP, competitive audit, AI Answer Hub feed one pipeline
5. **Never commit** `.env`, credentials, or `*.db` files
6. **Never import Streamlit** inside `services/` or `db/`

---

## Recent work & current status (as of June 2026)

### Completed

- Migrated web app database from SQLite to **Supabase PostgreSQL**
- Fixed Google OAuth (`error=Callback`) by removing PrismaAdapter, using JWT-only sessions
- Fixed auth allowlist lookup via **Supabase REST** on Vercel serverless
- Gmail email normalization for auth
- Deployed to production on `ai-search-os-web` → www.aisearchrank.ai
- Cleaned up duplicate Vercel projects
- Seeded admin user: redbearseoservices@gmail.com as ADMIN

### Known issues / watch items

- Auth sign-in must use the Google account matching a pre-approved email in Supabase `User` table
- If "Email not pre-approved" appears, check Vercel runtime logs for `[auth] signIn rejected` vs database errors
- Vercel `DATABASE_URL` must point to same Supabase project where users are seeded
- Corporate network may have SSL inspection issues (affects npm/vercel CLI locally)

### Typical dev commands

```powershell
cd d:\Dev\ai-search-os\web
npm run dev                          # localhost:3000
npx prisma db push                   # sync schema to Supabase
npx prisma generate
npx tsx scripts/seed-approved-user.ts redbearseoservices@gmail.com ADMIN
npx vercel deploy --prod --yes       # manual deploy to ai-search-os-web
```

---

## Business & go-to-market context

- **Domain:** aisearchrank.ai (registered, Vercel DNS)
- **Positioning:** AI search visibility OS for agencies — not just traditional SEO
- **Competitive angle:** Unified GEO/AEO platform vs. point tools
- **Monetization direction:** Agency plans (FREE / PRO / AGENCY / ENTERPRISE in schema), client portals, API access
- **Analytics:** GA4 enabled (`NEXT_PUBLIC_GA_MEASUREMENT_ID`)

---

## How I want Claude to help me

### Strategy & product

- Feature prioritization for agency SaaS
- GEO/AEO market positioning and messaging
- Pricing/packaging ideas
- User onboarding flows (especially auth + agency setup)

### Development

- Architecture decisions (keep rules-first principle)
- Debug production issues (auth, Vercel, Supabase)
- Code review — focused diffs, match existing conventions
- Help write scripts, SQL, env setup — but don't assume you can run them

### Content & marketing

- Landing page copy for aisearchrank.ai
- Help docs, email templates for agency clients
- Blog posts about AI search visibility

### What I don't need

- Generic SEO advice unrelated to AI visibility
- Overly long responses without a clear action
- Suggestions to rewrite the whole codebase
- Installing tools I didn't ask for

---

## Quick reference: ports

| Service | Port |
|---------|------|
| Next.js web | 3000 |
| Agent API | 8787 |
| Streamlit admin (ai-search-os) | 8502 |
| Citation REST (my-ai-seo) | 8510 |
| Citation Streamlit (my-ai-seo) | 8501 |

---

## Session starters (paste when beginning a new Claude chat)

**For product/strategy:**
> I'm Aaron, building AI Search OS (aisearchrank.ai) — a GEO/AEO platform for agencies. Help me with [specific question]. Context: rules-first architecture, Supabase + Next.js on Vercel, pre-approved auth.

**For debugging:**
> Production issue on www.aisearchrank.ai. Stack: Next.js 15, NextAuth Google OAuth, Supabase PostgreSQL, Vercel. Error: [paste error]. Don't commit unless I ask.

**For feature work:**
> Working in `d:\Dev\ai-search-os\web`. Feature: [describe]. Match existing patterns in the repo. Minimal diff. Rules-first with LLM fallback.

---

*Last updated: June 2026 — update this file as the project evolves.*
