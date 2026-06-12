from __future__ import annotations

import os

import pytest

from services.fix_agent_service import generate_fix_draft, generate_fixes, llm_available


@pytest.fixture(autouse=True)
def _no_llm_keys(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


def test_generate_fix_draft_rules_only():
    assert llm_available() is False
    gap = {
        "layer": "authority",
        "issue": "Authority scored 55/100 across 3 pages.",
        "severity": "high",
        "fix_hint": "Earn citations from industry publications.",
    }
    draft = generate_fix_draft(gap, "https://example.com")
    assert draft["action"]
    assert draft["layer"] == "authority"
    assert draft["severity"] == "high"
    assert isinstance(draft["successMetrics"], list)
    assert draft["estimatedEffort"] == "8-16 hours"


def test_generate_fixes_batch():
    gaps = [
        {"layer": "clarity", "issue": "Low FAQ coverage", "severity": "medium"},
        {"layer": "trust", "issue": "Missing privacy link", "severity": "low"},
    ]
    fixes = generate_fixes(gaps, "https://example.com")
    assert len(fixes) == 2
    for fix in fixes:
        assert fix["action"]
        assert fix["resources"]
