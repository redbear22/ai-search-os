"""Rules-first audit scoring — works with zero LLM keys."""

from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import urlparse

LAYERS = ("discoverability", "clarity", "authority", "trust")
MAX_CRAWL_PAGES = 10

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


async def crawl(site_url: str) -> list[dict[str, Any]]:
    """Read-only crawl stub — deterministic page signals without network I/O."""
    parsed = urlparse(site_url if "://" in site_url else f"https://{site_url}")
    host = (parsed.netloc or "example.com").lower()
    path = parsed.path.strip("/") or "home"
    slug = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-") or "home"

    pages: list[dict[str, Any]] = []
    for i in range(min(3, MAX_CRAWL_PAGES)):
        suffix = slug if i == 0 else f"{slug}-{i + 1}"
        pages.append(
            {
                "url": f"https://{host}/{suffix}",
                "title": f"{host.split('.')[0].title()} — {suffix.replace('-', ' ').title()}",
                "meta_description": f"Overview of {suffix.replace('-', ' ')} on {host}.",
                "h1_count": 1,
                "word_count": 420 + i * 80,
                "heading_count": 4 + i,
                "list_count": 2,
                "has_faq_block": i == 0,
                "outbound_ref_domains": 2 + i,
                "has_author_byline": i < 2,
                "links_to_about": i == 0,
                "is_https": True,
                "has_contact_signals": True,
                "has_privacy_policy_link": i == 0,
            }
        )
    return pages


def detect_gaps(
    scores: dict[str, int],
    pages: list[dict[str, Any]],
) -> list[dict[str, str]]:
    gaps: list[dict[str, str]] = []
    page_count = len(pages)
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
                    f"{layer.title()} scored {score}/100 across {page_count} crawled pages "
                    f"(threshold {threshold})."
                ),
                "severity": severity,
                "fix_hint": _GAP_HINTS[layer],
            }
        )
    return gaps
