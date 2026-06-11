# AI Search OS Demo Script (3 minutes)

Use this script when recording the product walkthrough. Target runtime: **~3:00**.

| Section | Duration | Cumulative |
|---------|----------|------------|
| Opening | 0:15 | 0:15 |
| Step 1: Run Audit | 0:30 | 0:45 |
| Step 2: Review Gaps | 0:30 | 1:15 |
| Step 3: Generate Fixes | 0:30 | 1:45 |
| Step 4: Action Plan | 0:20 | 2:05 |
| Step 5: Executive Summary | 0:20 | 2:25 |
| Step 6: Track Progress | 0:20 | 2:45 |
| Closing | 0:15 | 3:00 |

---

## Opening (15 seconds)

> "Meet AI Search OS – the only platform that shows you exactly how ChatGPT, Perplexity, Claude, and Gemini see your brand."

**Screen:** Dashboard or hero landing. Show logo and tagline.

---

## Step 1: Run Audit (30 seconds)

> "Enter your brand, add competitors, and click one button. Watch as all 4 AI platforms analyze your brand simultaneously."

**Screen:** `/audit` — Unified audit panel. Enter brand + domain + competitors → **Run Full AI Search Audit**. Show layer progress indicators filling in.

**Tips:** Pre-fill with a demo brand (e.g. PickAdviser) so the run completes reliably. Have API keys configured or use mock data for backup.

---

## Step 2: Review Gaps (30 seconds)

> "The platform automatically identifies where competitors are winning. See critical gaps highlighted in red."

**Screen:** `/gaps` — Summary cards (2×2 on mobile, row on desktop). Scroll to a **critical** gap card. Point at severity badge and layer.

---

## Step 3: Generate Fixes (30 seconds)

> "Click Generate Fix – AI writes your pitch email, action plan, and success metrics automatically."

**Screen:** Click **Generate Fix** on one gap. Show modal: Action Plan, Content Draft/Pitch, Success Metrics, Resources.

---

## Step 4: Add to Action Plan (20 seconds)

> "One click adds to your 90-day action plan. Drag and drop to prioritize."

**Screen:** **Add to Action Plan** in modal → `/action-plan`. Drag a card between layer columns (desktop) or swipe columns (mobile).

---

## Step 5: Executive Summary (20 seconds)

> "Generate a leadership-ready PDF in seconds. Present with confidence."

**Screen:** `/executive-summary` — Generate/export PDF. Brief flash of downloaded file or preview.

---

## Step 6: Track Progress (20 seconds)

> "Monthly check-ins show your share of voice improving over time."

**Screen:** `/check-in` or Zero-Click / Citation Intel charts showing trend lines over time.

---

## Closing (15 seconds)

> "AI Search OS – stop guessing how AI sees your brand. Start optimizing."

**Screen:** CTA — **Get started** button → `/audit` or sign-in. End card with URL: `https://ai-search-os.com` (or your production domain).

---

## Recording checklist

- [ ] 1920×1080 or 1280×720, 30fps
- [ ] Dark theme (matches default app)
- [ ] Close unrelated browser tabs; hide bookmarks bar
- [ ] `npm run dev` on port 3000; demo data seeded
- [ ] Mute notification sounds; use clean mic or voiceover in post
- [ ] Export: MP4 (H.264), under 50MB for web embed
