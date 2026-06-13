"""Rules-first audit scoring — works with zero LLM keys."""

from __future__ import annotations

import os
from typing import Any

from services.audit_crawl import crawl as crawl_site

LAYERS = ("discoverability", "clarity", "authority", "trust")

_GAP_THRESHOLDS = {
    "discoverability": 70,
    "clarity": 75,
    "authority": 65,
    "trust": 70,
}

_GAP_HINTS = {
    "discoverability": "Improve indexable content depth and internal linking.",
    "clarity": "Add concise FAQ/schema blocks that answer buyer questions directly.",
    "authority": "Earn citations from industry publications and expert roundups.",
    "trust": "Surface reviews, credentials, and third-party validation on key pages.",
}


def _score_discoverability(pages: list[dict[str, Any]]) -> int:
    if not pages:
        return 40
    titles = sum(1 for p in pages if (p.get("title") or "").strip())
    meta = sum(1 for p in pages if (p.get("meta_description") or "").strip())
    h1 = sum(1 for p in pages if p.get("h1_count", 0) >= 1)
    words = sum(int(p.get("word_count") or 0) for p in pages)
    avg_words = words / max(len(pages), 1)
    score = 35
    score += min(25, titles * 5)
    score += min(15, meta * 4)
    score += min(15, h1 * 4)
    score += min(25, int(avg_words / 120))
    return max(0, min(100, score))


def _score_clarity(pages: list[dict[str, Any]]) -> int:
    if not pages:
        return 45
    faq_signals = sum(1 for p in pages if p.get("has_faq_block"))
    headings = sum(int(p.get("heading_count") or 0) for p in pages)
    lists = sum(int(p.get("list_count") or 0) for p in pages)
    score = 40
    score += min(25, faq_signals * 8)
    score += min(20, headings // max(len(pages), 1))
    score += min(15, lists * 3)
    return max(0, min(100, score))


def _score_authority(pages: list[dict[str, Any]]) -> int:
    if not pages:
        return 35
    outbound_refs = sum(int(p.get("outbound_ref_domains") or 0) for p in pages)
    author_byline = sum(1 for p in pages if p.get("has_author_byline"))
    about_links = sum(1 for p in pages if p.get("links_to_about"))
    score = 30
    score += min(30, outbound_refs * 4)
    score += min(20, author_byline * 6)
    score += min(20, about_links * 5)
    return max(0, min(100, score))


def _score_trust(pages: list[dict[str, Any]]) -> int:
    if not pages:
        return 50
    https = sum(1 for p in pages if p.get("is_https"))
    contact = sum(1 for p in pages if p.get("has_contact_signals"))
    privacy = sum(1 for p in pages if p.get("has_privacy_policy_link"))
    score = 35
    score += min(25, https * 6)
    score += min(20, contact * 5)
    score += min(20, privacy * 8)
    return max(0, min(100, score))


def score_google_ai_overviews(
    query: str,
    brand: str,
    overview_html: str = "",
) -> dict[str, Any]:
    """Rules-first Google AI Overviews visibility — optional HTML from SERP fetch."""
    text = overview_html.lower()
    brand_l = brand.lower().strip()
    has_overview = bool(text and len(text) > 80)
    mentioned = bool(brand_l and brand_l in text) if has_overview else False
    score = 0
    if has_overview:
        score = 55
        if mentioned:
            score += 35
        if "http" in text:
            score += 10
    return {
        "platform": "google_ai_overviews",
        "query": query,
        "has_overview": has_overview,
        "brand_mentioned": mentioned,
        "score": max(0, min(100, score)),
    }


RULES: dict[str, Any] = {
    "discoverability": _score_discoverability,
    "clarity": _score_clarity,
    "authority": _score_authority,
    "trust": _score_trust,
}


def llm_available() -> bool:
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(openai_key or anthropic_key)


def llm_refine(layer: str, pages: list[dict[str, Any]]) -> int:
    """Optional LLM enhancement — not implemented; rules-only path is canonical."""
    raise NotImplementedError("LLM refine is optional and not wired in Phase 1")


def blend(base: int, refined: int) -> int:
    return max(0, min(100, int(base * 0.7 + refined * 0.3)))


def score_layer(layer: str, pages: list[dict[str, Any]]) -> int:
    scorer = RULES.get(layer)
    if scorer is None:
        return 50
    base = int(scorer(pages))
    if llm_available():
        try:
            return blend(base, llm_refine(layer, pages))
        except Exception:
            return base
    return base


async def crawl(site_url: str) -> dict[str, Any]:
    """Real HTTP crawl — returns page signals plus crawl summary metadata."""
    return await crawl_site(site_url)


def _detect_signal_gaps(pages: list[dict[str, Any]]) -> list[dict[str, str]]:
    gaps: list[dict[str, str]] = []
    seen: set[str] = set()

    def _add(layer: str, issue: str, severity: str, fix_hint: str) -> None:
        key = f"{layer}:{issue}"
        if key in seen:
            return
        seen.add(key)
        gaps.append(
            {"layer": layer, "issue": issue, "severity": severity, "fix_hint": fix_hint}
        )

    for page in pages:
        url = page.get("url") or "page"
        if page.get("fetch_error"):
            _add(
                "discoverability",
                f"Could not fetch {url}: {page['fetch_error']}",
                "high",
                "Ensure the page is publicly reachable and returns HTML with HTTP 200.",
            )
            continue

        title = (page.get("title") or "").strip()
        if not title:
            _add(
                "discoverability",
                f"Missing <title> on {url}",
                "high",
                "Add a unique, descriptive title tag (50–60 characters).",
            )
        elif len(title) < 15:
            _add(
                "discoverability",
                f"Thin title ({len(title)} chars) on {url}: \"{title}\"",
                "medium",
                "Expand the title tag with primary topic and brand name.",
            )

        if not (page.get("meta_description") or "").strip():
            _add(
                "discoverability",
                f"Missing meta description on {url}",
                "medium",
                "Add a meta description summarizing the page for search and AI snippets.",
            )

        if page.get("h1_count", 0) < 1:
            _add(
                "clarity",
                f"No H1 heading found on {url}",
                "medium",
                "Add one clear H1 that states the page topic.",
            )

        if not page.get("has_json_ld"):
            _add(
                "clarity",
                f"No JSON-LD structured data on {url}",
                "medium",
                "Add schema.org JSON-LD (Organization, FAQPage, or Article as appropriate).",
            )

        if not page.get("is_https"):
            _add(
                "trust",
                f"Page served without HTTPS: {url}",
                "high",
                "Enable TLS and redirect HTTP to HTTPS.",
            )

        robots = (page.get("robots_meta") or "").lower()
        if "noindex" in robots:
            _add(
                "discoverability",
                f"robots meta noindex on {url}",
                "high",
                "Remove noindex if this page should appear in search and AI answers.",
            )

    return gaps


def detect_gaps(
    scores: dict[str, int],
    pages: list[dict[str, Any]],
) -> list[dict[str, str]]:
    gaps: list[dict[str, str]] = _detect_signal_gaps(pages)
    page_count = len(pages)
    successful = sum(1 for p in pages if not p.get("fetch_error"))
    for layer in LAYERS:
        score = int(scores.get(layer, 0))
        threshold = _GAP_THRESHOLDS[layer]
        if score >= threshold:
            continue
        severity = "high" if score < threshold - 15 else "medium"
        gaps.append(
            {
                "layer": layer,
                "issue": (
                    f"{layer.title()} scored {score}/100 across {successful or page_count} "
                    f"crawled pages (threshold {threshold})."
                ),
                "severity": severity,
                "fix_hint": _GAP_HINTS[layer],
            }
        )
    return gaps
