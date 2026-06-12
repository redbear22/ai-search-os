from __future__ import annotations

import asyncio

import pytest

from services.audit_agent_service import detect_gaps, score_layer
from services.audit_crawl import (
    _failed_page,
    normalize_site_url,
    parse_page_html,
)


SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
  <title>Example Brand — Home</title>
  <meta name="description" content="We help teams grow with AI search visibility.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="Example Brand">
  <meta property="og:description" content="AI search OS">
  <script type="application/ld+json">{"@type":"Organization","name":"Example"}</script>
</head>
<body>
  <h1>Welcome to Example Brand</h1>
  <h2>How it works</h2>
  <ul><li>Step one</li><li>Step two</li></ul>
  <p>Contact us at <a href="mailto:hello@example.com">hello@example.com</a></p>
  <a href="/about">About</a>
  <a href="https://news.example.org/story">Press</a>
  <section class="faq"><h2>FAQ</h2></section>
  <span class="author">Jane Doe</span>
  <a href="/privacy-policy">Privacy</a>
</body>
</html>
"""


def test_normalize_site_url_adds_https():
    assert normalize_site_url("example.com") == "https://example.com/"


def test_parse_page_html_extracts_signals():
    page = parse_page_html(
        SAMPLE_HTML,
        url="https://example.com/",
        status_code=200,
        response_time_ms=120,
    )
    assert page["title"] == "Example Brand — Home"
    assert "AI search visibility" in page["meta_description"]
    assert page["h1_count"] == 1
    assert page["h1_text"] == "Welcome to Example Brand"
    assert page["canonical"] == "https://example.com/"
    assert page["robots_meta"] == "index,follow"
    assert page["has_json_ld"] is True
    assert page["has_open_graph"] is True
    assert page["is_https"] is True
    assert page["word_count"] > 10
    assert page["has_faq_block"] is True
    assert page["has_author_byline"] is True
    assert page["links_to_about"] is True
    assert page["has_contact_signals"] is True
    assert page["has_privacy_policy_link"] is True
    assert page["outbound_ref_domains"] >= 1
    assert page["response_time_ms"] == 120


def test_score_layer_from_parsed_html():
    page = parse_page_html(
        SAMPLE_HTML,
        url="https://example.com/",
        status_code=200,
        response_time_ms=50,
    )
    pages = [page]
    for layer in ("discoverability", "clarity", "authority", "trust"):
        score = score_layer(layer, pages)
        assert 0 <= score <= 100
    assert score_layer("discoverability", pages) > score_layer("discoverability", [])


def test_detect_gaps_from_real_signals():
    thin_html = "<html><head><title>Hi</title></head><body><p>Short</p></body></html>"
    page = parse_page_html(
        thin_html,
        url="http://example.com/",
        status_code=200,
        response_time_ms=80,
    )
    scores = {layer: score_layer(layer, [page]) for layer in ("discoverability", "clarity", "authority", "trust")}
    gaps = detect_gaps(scores, [page])
    issues = " ".join(g["issue"] for g in gaps)
    assert "Missing meta description" in issues
    assert "Thin title" in issues or "Missing meta description" in issues
    assert "No JSON-LD" in issues
    assert "without HTTPS" in issues


def test_detect_gaps_fetch_failure():
    page = _failed_page(
        "https://blocked.example/",
        status_code=403,
        fetch_error="HTTP 403",
    )
    scores = {layer: score_layer(layer, [page]) for layer in ("discoverability", "clarity", "authority", "trust")}
    gaps = detect_gaps(scores, [page])
    assert any("Could not fetch" in g["issue"] for g in gaps)
    assert any(g["severity"] == "high" for g in gaps)


def test_crawl_mocked_success(monkeypatch):
    html = SAMPLE_HTML

    async def fake_fetch(client, url, *, timeout_sec):
        return parse_page_html(html, url=url, status_code=200, response_time_ms=100)

    monkeypatch.setattr("services.audit_crawl._fetch_page", fake_fetch)

    from services.audit_crawl import crawl

    result = asyncio.run(crawl("example.com"))
    assert result["summary"]["pages_fetched"] >= 1
    assert result["pages"][0]["title"] == "Example Brand — Home"
    assert result["summary"]["site_url"] == "https://example.com/"


def test_crawl_mocked_homepage_failure(monkeypatch):
    async def fake_fetch(client, url, *, timeout_sec):
        return _failed_page(url, status_code=403, fetch_error="HTTP 403")

    monkeypatch.setattr("services.audit_crawl._fetch_page", fake_fetch)

    from services.audit_crawl import crawl

    result = asyncio.run(crawl("https://example.com"))
    assert result["summary"]["pages_fetched"] == 0
    assert result["summary"]["errors"]
    assert result["pages"][0]["fetch_error"] == "HTTP 403"


def test_crawl_mocked_timeout(monkeypatch):
    async def fake_fetch(client, url, *, timeout_sec):
        return _failed_page(url, fetch_error="Request timed out", response_time_ms=10000)

    monkeypatch.setattr("services.audit_crawl._fetch_page", fake_fetch)

    from services.audit_crawl import crawl

    result = asyncio.run(crawl("example.com"))
    assert result["summary"]["pages_attempted"] == 1
    assert "timed out" in result["summary"]["errors"][0]["error"].lower()
