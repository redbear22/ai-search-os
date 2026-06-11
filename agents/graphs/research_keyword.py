"""Research keyword graph — enqueue AI Answer + optional gap."""

from __future__ import annotations

from typing import Any

from services.ai_answer_service import build_ai_answer_report, save_report
from services.gap_service import create_gap

GRAPH_NAME = "research_keyword"


def run_research_keyword(db_path: str, *, keyword: str, create_gap_flag: bool = True) -> dict[str, Any]:
    report = build_ai_answer_report(keyword, use_api=True)
    run_id = save_report(db_path, report)
    gap_id = None
    if create_gap_flag:
        gap_id = create_gap(
            db_path,
            keyword=keyword,
            priority=70,
            reasoning=f"Auto gap from research_keyword run #{run_id}",
            source="agent",
        )
    return {
        "graph": GRAPH_NAME,
        "keyword": keyword,
        "intent_run_id": run_id,
        "gap_id": gap_id,
        "must_answer_count": len(report.must_answer),
        "source": report.source,
    }
