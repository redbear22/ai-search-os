"""Rules-first fix draft generation — works with zero LLM keys."""

from __future__ import annotations

import os
from typing import Any

_OWNER_BY_LAYER = {
    "discoverability": "SEO",
    "clarity": "Content",
    "authority": "PR",
    "trust": "Marketing",
}

_EFFORT_BY_SEVERITY = {
    "high": "8-16 hours",
    "medium": "4-8 hours",
    "low": "2-4 hours",
}


def llm_available() -> bool:
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(openai_key or anthropic_key)


def llm_refine_fix(gap: dict[str, Any], site_url: str) -> dict[str, Any]:
    """Optional LLM enhancement — not implemented; rules-only path is canonical."""
    raise NotImplementedError("LLM refine is optional and not wired in Phase 2")


def _merge_fix_draft(base: dict[str, Any], refined: dict[str, Any]) -> dict[str, Any]:
    return {
        "action": refined.get("action") or base["action"],
        "contentDraft": refined.get("contentDraft") or base["contentDraft"],
        "successMetrics": refined.get("successMetrics") or base["successMetrics"],
        "resources": refined.get("resources") or base["resources"],
        "estimatedEffort": refined.get("estimatedEffort") or base["estimatedEffort"],
        "layer": base.get("layer"),
        "severity": base.get("severity"),
        "issue": base.get("issue"),
    }


def rules_only_fix(gap: dict[str, Any], site_url: str) -> dict[str, Any]:
    layer = str(gap.get("layer") or "general").lower()
    issue = str(gap.get("issue") or "visibility gap").strip()
    severity = str(gap.get("severity") or "medium").lower()
    fix_hint = str(gap.get("fix_hint") or "").strip()
    owner = _OWNER_BY_LAYER.get(layer, "SEO")
    title = issue.split(".")[0][:120] or f"{layer.title()} gap"

    action_parts = [f'Address "{title}" on {site_url} ({layer}).']
    if fix_hint:
        action_parts.append(fix_hint)
    else:
        action_parts.append(
            f"Prioritize measurable steps owned by {owner} to close this {severity}-severity gap."
        )

    return {
        "layer": layer,
        "severity": severity,
        "issue": issue,
        "action": " ".join(action_parts),
        "contentDraft": "",
        "successMetrics": [
            "Gap status moves to in progress within 1 week",
            "Measurable KPI improvement within 30 days",
        ],
        "resources": [owner, "Analytics"],
        "estimatedEffort": _EFFORT_BY_SEVERITY.get(severity, "4-8 hours"),
    }


def generate_fix_draft(gap: dict[str, Any], site_url: str) -> dict[str, Any]:
    base = rules_only_fix(gap, site_url)
    if llm_available():
        try:
            refined = llm_refine_fix(gap, site_url)
            return _merge_fix_draft(base, refined)
        except Exception:
            return base
    return base


def generate_fixes(gaps: list[dict[str, Any]], site_url: str) -> list[dict[str, Any]]:
    if not gaps:
        return []
    return [generate_fix_draft(gap, site_url) for gap in gaps]
