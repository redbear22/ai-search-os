from __future__ import annotations

import os

import pytest

from services.audit_agent_service import (
    LAYERS,
    detect_gaps,
    llm_available,
    score_layer,
)


@pytest.fixture(autouse=True)
def _no_llm_keys(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


def _sample_pages():
    return [
        {
            "url": "https://example.com/",
            "title": "Example Home",
            "meta_description": "Welcome to example",
            "h1_count": 1,
            "word_count": 500,
            "heading_count": 5,
            "list_count": 2,
            "has_faq_block": True,
            "outbound_ref_domains": 3,
            "has_author_byline": True,
            "links_to_about": True,
            "is_https": True,
            "has_contact_signals": True,
            "has_privacy_policy_link": True,
        }
    ]


def test_score_layer_rules_only_no_api_keys():
    assert llm_available() is False
    pages = _sample_pages()
    for layer in LAYERS:
        score = score_layer(layer, pages)
        assert isinstance(score, int)
        assert 0 <= score <= 100


def test_score_layer_empty_pages_still_valid():
    for layer in LAYERS:
        score = score_layer(layer, [])
        assert 0 <= score <= 100


def test_detect_gaps_deterministic():
    pages = _sample_pages()
    scores = {layer: score_layer(layer, pages) for layer in LAYERS}
    gaps = detect_gaps(scores, pages)
    assert isinstance(gaps, list)
    for gap in gaps:
        assert gap["layer"] in LAYERS
        assert gap["severity"] in ("medium", "high")
        assert gap["issue"]
        assert gap["fix_hint"]


def test_score_layer_llm_keys_present_but_not_wired(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    pages = _sample_pages()
    score = score_layer("discoverability", pages)
    assert 0 <= score <= 100
