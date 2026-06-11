"""Strategy brain — rules-first portfolio actions for a gap."""

from __future__ import annotations

from contracts.agentic_os import ActionKind, StrategyAction, StrategyPortfolioReport
from services import gap_service


def build_strategy_report(db_path: str, *, keyword: str, gap_id: int = 0) -> StrategyPortfolioReport:
    keyword = keyword.strip()
    actions: list[StrategyAction] = [
        StrategyAction(
            kind=ActionKind.run_ai_answer,
            priority=90,
            title="Run AI Answer Hub",
            reasoning="Surface cross-engine must-answer questions before drafting.",
            acceptance_criteria=["Unified must-answer list saved"],
            auto_safe=True,
        ),
        StrategyAction(
            kind=ActionKind.run_audit,
            priority=75,
            title="Competitive audit",
            reasoning="Compare top SERP pages for FAQ and heading gaps.",
            acceptance_criteria=["Audit JSON saved on gap"],
        ),
        StrategyAction(
            kind=ActionKind.write_new,
            priority=60,
            title="Synthesize brief",
            reasoning="Turn gap + intent into an outline with 5–8 FAQs.",
            acceptance_criteria=["Brief outline with FAQ priorities"],
        ),
    ]

    if gap_id:
        gaps = gap_service.list_gaps(db_path, limit=500)
        match = next((g for g in gaps if g["id"] == gap_id), None)
        if match and match.get("status") == "open":
            actions.insert(
                0,
                StrategyAction(
                    kind=ActionKind.monitor,
                    priority=40,
                    title="Monitor gap",
                    reasoning=match.get("reasoning") or "Gap is open — confirm intent before shipping.",
                ),
            )

    return StrategyPortfolioReport(
        keyword=keyword,
        gap_id=gap_id,
        actions=actions,
        context_summary=f"Rules portfolio for '{keyword}'",
        source="rules",
    )
