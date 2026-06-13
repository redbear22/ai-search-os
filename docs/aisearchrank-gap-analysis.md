# AI Search Rank — Full Gap Analysis & Strategic Roadmap

> **Purpose:** Honest assessment of where the product stands vs. the market benchmark, what's missing, and what to build next to be genuinely incredible.  
> **Market source:** 2026 GEO Platform Feature Matrix (20 tools, 12 capabilities)  
> **Last updated:** 2026-06-13

---

## The Benchmark That Matters

The market has converged on 12 capabilities that separate real optimization platforms from monitoring dashboards. Here's how AI Search Rank scores honestly against each:

| Capability | AI Search Rank | Market leaders | Gap? |
|---|---|---|---|
| 1. Multi-model coverage | ✅ Full (4: GPT/Perplexity/Claude/Gemini) | 6–10+ models | ⚠️ Missing: Grok, DeepSeek, Copilot, AI Overviews |
| 2. Prompt volume + difficulty data | ⚠️ Partial (Keywords Everywhere/DataForSEO) | Full prompt databases | 🔴 Real gap |
| 3. Answer gap analysis | ✅ Full | Full | ✅ Strong |
| 4. AI content generation | ✅ Full (Fix Engine — the moat) | Most: No | ✅ Category leader |
| 5. Citation + source analysis | ✅ Full (Citation Engine) | Partial–Full | ✅ Strong |
| 6. AI crawler logs | ❌ None | Promptwatch: Full | 🔴 Missing entirely |
| 7. Traffic attribution | ⚠️ Partial (GSC scaffold only) | Full on leaders | 🔴 Real gap |
| 8. Reddit + YouTube tracking | ❌ None | Promptwatch: Full | 🟡 Medium gap |
| 9. ChatGPT Shopping tracking | ❌ None | Promptwatch: Full | ⚪ Low priority (e-commerce only) |
| 10. Competitor heatmaps | ⚠️ Partial (comparison exists, no visual map) | Full on leaders | 🟡 Medium gap |
| 11. Multi-language + multi-region | ❌ None | Full on leaders | 🟡 Medium gap (agency need) |
| 12. API + integrations | ✅ Full (REST API v1, webhooks) | Partial on most | ✅ Strong |

**Overall score: 7/12 full or strong, 3/12 partial, 2/12 missing entirely.**

The two missing ones (crawler logs, Reddit/YouTube) are where the gap is real. The Fix Engine (capability 4) is where you're ahead of almost everyone.

---

## Gap 1 — AI Crawler Logs 🔴 HIGH PRIORITY

**What it is:** Show users when ChatGPT, Claude, Perplexity, and Google AI crawlers visit their site, which pages they read, what errors they hit, and how crawl frequency correlates with citation changes.

**Why it matters:** This is the "evidence layer" — it tells you *why* you're being cited or not. No other signal is more direct. Promptwatch is the only platform with this fully built and it's one of their biggest differentiators.

**What you have:** Nothing. Zero visibility into AI crawler behaviour.

**How to build it (rules-first, no LLM needed):**
- Parse server access logs for known AI crawler user-agents (GPTBot, ClaudeBot, PerplexityBot, GoogleOther/Extended)
- Show: crawl frequency per page, last crawl date, crawl errors (4xx, 5xx), pages never crawled
- Surface: "Your /about page has never been crawled by any AI bot" → instant gap with a fix
- Input method: either a server log upload (CSV/access.log) or a lightweight script users add to their server

**Build estimate:** 2–3 days for a meaningful MVP. No external API needed — pure log parsing.

**Where it surfaces:** New sidebar item: `/crawler-logs` — "AI Crawler Intelligence"

---

## Gap 2 — Traffic Attribution 🔴 HIGH PRIORITY

**What it is:** Connect AI visibility scores to actual website traffic and conversions. Answer the question: "Did our Share of Voice improvement actually drive more visits?"

**Why it matters:** This is the ROI proof agencies need to justify the subscription to clients. Without it, you're telling them they're more visible in AI but can't prove it drove business.

**What you have:** GSC OAuth scaffold (validated, UI not wired). That's the right start.

**How to build it:**
- Phase 1 (fast): Wire GSC data import — property picker + query cache showing organic click trends alongside audit SoV scores. Already in the roadmap.
- Phase 2: Side-by-side chart: "SoV this month vs. organic traffic change" — simple correlation, not causal claim
- Phase 3: UTM parameter guide — show users how to tag AI-referral traffic for attribution in GA4

**The agency pitch:** "Last month we improved your client's AI Share of Voice from 12% to 31%. Here's the traffic delta from GSC during the same period." That's a renewal conversation, not a churn conversation.

**Build estimate:** Phase 1 (GSC property picker + query import) = 3–4 days.

---

## Gap 3 — Prompt Volume + Difficulty Data 🔴 HIGH PRIORITY

**What it is:** For any given topic or brand category, how often do people ask AI platforms about it, and how hard is it to get cited in that answer?

**Why it matters:** Right now your audit tells users *what* gaps exist. Prompt volume tells them *which gaps to fix first* based on actual query frequency — the difference between fixing a gap that matters and one that's barely asked.

**What you have:** Keywords Everywhere and DataForSEO give you traditional search volume. Not the same as AI prompt frequency.

**The opportunity:** No one has truly solved AI prompt volume data yet — it's the hardest data problem in the space. But you can approximate it:
- Use Google Trends data (you already have Trends MCP) as a proxy for query intent volume
- Overlay traditional keyword search volume as a directional signal
- Add a "prompt difficulty" score based on how many competitor domains appear in AI answers for that query
- Label it clearly: "Estimated AI query volume" (not falsely precise)

**This is defensible** even as an approximation — and it's more than most competitors offer.

---

## Gap 4 — Reddit + YouTube Tracking 🟡 MEDIUM PRIORITY

**What it is:** AI models heavily cite Reddit discussions and YouTube videos. Surface which Reddit threads and YouTube videos are influencing AI recommendations in your client's category — so they know where to participate or publish.

**Why it matters:** AI models heavily cite Reddit and YouTube, and knowing where AI pulls from tells you where to publish. An agency that publishes a YouTube comparison video or participates in the right Reddit thread can move their client's AI citations faster than any on-page change.

**What you have:** Nothing.

**How to build it (lean MVP):**
- Reddit: Use Reddit's public API to search for top posts in a given topic/category. Surface top 10 posts AI is likely reading. Flag whether client's brand appears in any.
- YouTube: Use YouTube Data API (you scoped this as the VidIQ alternative) to surface top videos for category keywords. Flag citation opportunity.
- Label it: "AI Sources — where AI learns about your category"

**Build estimate:** 3–4 days for a meaningful MVP. You already have the YouTube API knowledge from the VidIQ scoping work.

---

## Gap 5 — Expanded Model Coverage 🟡 MEDIUM PRIORITY

**What you have:** ChatGPT, Perplexity, Claude, Gemini (4 platforms).

**What market leaders cover:** 6–10+ including Grok (X), DeepSeek, Microsoft Copilot, Google AI Overviews (distinct from Gemini), Meta AI.

**The honest gap:** Google AI Overviews is the most important missing one — it's the highest-volume AI answer surface by far (billions of Google searches). Copilot (Microsoft/Bing) is second in enterprise relevance. Grok matters for X-native audiences.

**Recommendation:** Add Google AI Overviews first. It's technically achievable (scrape/headless browser the SERP for AI Overview content), and it's what every SEO agency cares about most because their clients are already in Google Search Console.

---

## Gap 6 — Competitor Heatmaps 🟡 MEDIUM PRIORITY

**What you have:** Side-by-side comparison table (competitor scores vs. yours). Good but static.

**What's missing:** A visual map showing competitor AI visibility across multiple prompts/categories simultaneously — "Your competitor is strong in prompts about [topic A] but weak in [topic B]. That's where you attack."

**How to build it:** Take your existing competitor comparison data and render it as a heat map grid (competitor × prompt category × visibility score). Green = they dominate, red = opportunity. One React component, existing data.

---

## Gap 7 — Multi-Language + Multi-Region 🟡 MEDIUM PRIORITY (Agency need)

**What you have:** English-only, US/Canada-focused.

**Why it matters for agencies:** An agency managing a European client needs to know how ChatGPT answers about that brand *in French, in Germany*. AI citation patterns vary significantly by language and region.

**Recommendation:** Don't build this until you have your first agency asking for it. It's a real gap but not a day-one problem. Flag it in the "coming soon" section honestly.

---

## What You Do Better Than Everyone Else (Keep Building These)

**Fix Engine — capability 4:** Most GEO/AEO platforms in 2026 are monitoring-only dashboards. They show you visibility data but stop there. You write the fix. This is genuine category leadership. Profound ($90M in VC) doesn't do it. AthenaHQ doesn't do it. Scrunch doesn't do it. **This is your moat — keep deepening it.**

**Full execution loop:** Audit → Gaps → Fix → Action Plan → Tasks → Check-in. No competitor has this end-to-end. Most stop at "here's a report."

**Agency infrastructure:** White-label, client workspaces, portals, team RBAC. Most monitoring tools are single-brand. You're built agency-native.

**Rules-first + offline fallbacks:** Unique in the market. Every competitor hard-depends on LLM APIs. When OpenAI is down, your tool still works.

**HITL on fixes:** The approval gate before anything goes live is a genuine trust differentiator for enterprise and agency buyers who can't afford to auto-publish AI content without review.

---

## The Three Builds That Make This "Totally Incredible"

Ranked by impact vs. effort:

### Build 1: AI Crawler Intelligence ← Do this next
**Impact:** Turns a good audit into an indisputable audit. When you can show a client "ChatGPT has never crawled your /case-studies page — that's why you're not cited" — that's an unanswerable argument. No competitor has this cleanly.
**Effort:** 2–3 days. Log parsing, no external APIs.
**Where:** `/crawler-logs` — "AI Crawler Intelligence"

### Build 2: GSC Traffic Attribution ← Do this second
**Impact:** Closes the ROI loop for agencies. The subscription justifies itself when you can show "SoV up 19%, here's the traffic delta."
**Effort:** 3–4 days. GSC OAuth is already scaffolded.
**Where:** `/dashboard/gsc` — already in the sidebar.

### Build 3: Reddit + YouTube Source Tracking ← Do this third
**Impact:** Tells users *where* AI learns about their category — the most actionable intelligence available. Publish one YouTube video in the right place and move citations faster than any on-page fix.
**Effort:** 3–4 days. Reddit public API + YouTube Data API (already scoped).
**Where:** New section in Citation Intelligence or standalone `/ai-sources`

---

## The Feature That Would Make You #1

There is one capability no tool has fully solved that would make AI Search Rank the undisputed category leader if you build it well:

**Prompt-to-Citation Attribution Chain**

Show users: *this specific prompt → these AI citations → these source pages → these gaps → these fixes → this content → this citation result.*

The full causal chain from "someone asked AI a question" to "here's why you appeared or didn't appear, and here's the one thing that would change it."

Right now every tool shows pieces of this. Nobody shows the whole chain in one view. The platform that does this first, clearly, for non-technical agency users wins the market.

This is a 2–3 week build, not a 2-day build. But it's the north star.

---

## Immediate Action List

| Priority | Build | Effort | Revenue impact |
|---|---|---|---|
| 🔴 1 | AI Crawler Logs (`/crawler-logs`) | 2–3 days | High — unique differentiator |
| 🔴 2 | GSC Traffic Attribution (wire existing scaffold) | 3–4 days | High — agency retention |
| 🔴 3 | Phase 2 Fix Agent fully live (real fixes, not scaffold) | In progress | High — the moat |
| 🟡 4 | Reddit + YouTube source tracking | 3–4 days | Medium — agency wow factor |
| 🟡 5 | Google AI Overviews as 5th platform | 3–5 days | Medium — most-requested |
| 🟡 6 | Competitor heatmap visual | 1–2 days | Medium — visual upgrade |
| 🟡 7 | Prompt volume approximation layer | 2–3 days | Medium — prioritisation tool |
| ⚪ 8 | Stripe billing | 1 day | Immediate — when first paid user ready |
| ⚪ 9 | Multi-language/region | 2–3 weeks | Low until agency asks for it |

---

## What to Say to an Agency Right Now

With what you have built today, you can already say:

> "We're the only AEO platform that audits your client across ChatGPT, Perplexity, Claude, and Gemini simultaneously — and then writes the fixes automatically. Every other tool gives you a dashboard. We give you the work done."

After you build crawler logs and GSC attribution, you can add:

> "We show you exactly when AI crawlers visit your client's site, which pages they read, and which pages they've never seen — so you know precisely why citations are happening or not. And we connect that to actual traffic data so you can prove the ROI."

That combination — fix engine + crawler intelligence + traffic attribution — is unmatched in the current market.

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-13 | Initial gap analysis — 12-capability benchmark, 7 gaps identified, 3-build priority plan, north-star feature defined |
