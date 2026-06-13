# Morning Handoff — Overnight Build (2026-06-13)

Autonomous build from `cursor-overnight-prompt.md`. Phases 1–5 implemented locally; homepage/intro animation work left untouched.

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| **1 — AI Crawler Intelligence** | **DONE** | `/crawler-logs`, parse/check APIs, Prisma models, sidebar + dashboard card |
| **2 — GSC Traffic Attribution** | **DONE** | OAuth flow, AES token encryption, properties/queries APIs, live `/dashboard/gsc` UI |
| **3 — Reddit + YouTube Sources** | **DONE** | `/ai-sources`, cached APIs, gap creation, env-check YouTube entry |
| **4 — Google AI Overviews** | **DONE** | 5th platform `google_aio`, rules-first SERP fetch, agent service scorer |
| **5 — Competitor Heatmap** | **DONE** | `CompetitorHeatmap` on `/gaps` when competitors exist |

## Commits (oldest → newest)

```
5775d5e feat(web): AI crawler intelligence — log parsing, robots.txt check, never-crawled detection
12a4f93 feat(web): GSC traffic attribution — OAuth flow, encrypted tokens, query import
6f6e7d4 feat(web): Reddit + YouTube source tracking — APIs, 24h cache, AI Sources page
1bd4ff1 feat(web): Google AI Overviews — 5th clarity platform with rules-first SERP fetch
32a44cb feat(web): competitor heatmap — layer grid with attack insight on /gaps
```

## Blockers / partial items

- **Prisma migrate:** `npx prisma migrate deploy` failed locally with `P1000` (Supabase credentials in `.env` invalid from this machine). Migration SQL exists at `web/prisma/migrations/20250613080000_crawler_gsc_sources/`. Aaron must run migrate against production/staging DB before deploy.
- **GSC OAuth:** Implemented but requires manual browser login — not verified end-to-end overnight.
- **Google AI Overviews SERP fetch:** Google may block server-side requests; UI falls back to manual paste message. Test from Aaron's network.
- **YouTube:** Requires `YOUTUBE_API_KEY` in `web/.env.local` (optional); Reddit works without keys.
- **Build:** `npm run build` succeeds with `NODE_TLS_REJECT_UNAUTHORIZED=0` on this Windows host (Google Fonts TLS). Pre-existing issue.

## Uncommitted work preserved (not touched)

- `web/app/page.tsx`, `web/app/homepage.css`
- `web/components/HeroCanvas.tsx`, `IntroModal.tsx`
- `web/public/intro/`, `web/public/aisearchrank-intro.html`
- `web/content/sample-audit-page.html`

## Manual verification checklist

### Phase 1 — Crawler logs

1. `cd web && npm run dev`
2. Sign in (or `DEV_AUTH_BYPASS=true`)
3. Open http://localhost:3000/crawler-logs
4. Quick check: enter `aisearchrank.ai` → robots.txt + sitemap analysis
5. Upload `web/test-fixtures/sample-access.log` → should show GPTBot, ClaudeBot, PerplexityBot hits
6. Confirm sidebar: Citation Monitor → Crawler Logs → KPIs

### Phase 2 — GSC (requires Aaron)

1. In Google Cloud Console, add OAuth redirect: `http://localhost:3000/api/gsc/callback` (and production URL)
2. Set in `web/.env.local` (do not commit):
   ```env
   GSC_ENABLED=true
   GOOGLE_GSC_CLIENT_ID=...
   GOOGLE_GSC_CLIENT_SECRET=...
   ```
3. Open http://localhost:3000/dashboard/gsc → **Connect Google Search Console**
4. Complete Google login → property picker → query table
5. Verify tokens encrypted in DB:
   ```sql
   SELECT LEFT("accessToken", 20) FROM "GscConnection";
   ```
   Should NOT start with `ya29.` (encrypted blob)

### Phase 3 — AI Sources

1. http://localhost:3000/ai-sources
2. Topic: `project management software remote teams`, brand: your test brand
3. Reddit should return posts; YouTube shows message if no API key
4. Repeat search → should hit cache (`Results served from 24h cache`)
5. **Add to gaps** → check `/gaps` or Postgres `Gap` table

### Phase 4 — Google AI Overviews

1. `/audit` → Clarity tab → 5th tab **Google AI Overviews** (#34A853)
2. Enter brand → Query AI → rules-first SERP parse (or fallback message)

### Phase 5 — Competitor heatmap

1. Complete audit with 2+ named competitors in discoverability
2. `/gaps` → scroll to **Competitor heatmap** card

## Deploy notes

1. Run migration on Supabase before Vercel deploy:
   ```powershell
   cd web
   npx prisma migrate deploy
   npx prisma generate
   ```
2. Vercel env: ensure `GSC_ENABLED`, GSC OAuth creds, optional `YOUTUBE_API_KEY`
3. Add GSC redirect URI: `https://www.aisearchrank.ai/api/gsc/callback`
4. No Stripe, homepage, or `.env` changes in this build

## Open items for Aaron

- [ ] Fix/rotate local `DATABASE_URL` and run migrate
- [ ] Manual GSC OAuth smoke test
- [ ] Add `YOUTUBE_API_KEY` if YouTube source tracking needed in prod
- [ ] Review `gemini` label rename (now "Gemini" vs new "Google AI Overviews")
- [ ] Deploy when ready — no auto-deploy performed
- [ ] Commit preserved homepage/intro WIP separately when ready

## Rules compliance

- Rules-first: crawler logs, robots check, Reddit, Google AIO SERP parse — no LLM required
- HITL: gap/action-plan buttons create drafts only; nothing auto-publishes
- Smallest correct fix; no `.env` or Stripe touched
