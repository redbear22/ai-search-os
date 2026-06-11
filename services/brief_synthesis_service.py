"""Brief synthesis — rules-first outline from AI Answer report."""

from __future__ import annotations

from contracts.agentic_os import BriefSectionPlan, BriefSynthesisPackage
from services.ai_answer_service import build_ai_answer_report


def synthesize_brief(keyword: str, *, gap_id: int = 0, db_path: str | None = None) -> BriefSynthesisPackage:
    report = build_ai_answer_report(keyword, use_api=bool(db_path))
    faqs = [m.question for m in report.must_answer[:8]]

    outline = [
        BriefSectionPlan(title="Direct answer summary", bullets=["One-paragraph answer for AI citation"]),
        BriefSectionPlan(title="Comparison at a glance", bullets=["Table or bullets vs alternatives"]),
        BriefSectionPlan(title="Who should skip this", bullets=["Honest disqualifiers build trust"]),
        BriefSectionPlan(title="FAQ", bullets=faqs[:5]),
    ]

    return BriefSynthesisPackage(
        keyword=keyword,
        gap_id=gap_id,
        decision="new_post",
        differentiation_thesis=f"Answer what engines and forums already surface for '{keyword}'.",
        outline=outline,
        faq_priorities=faqs,
        source=report.source,
    )
