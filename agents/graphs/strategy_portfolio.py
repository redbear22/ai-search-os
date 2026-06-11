"""Strategy portfolio graph."""

from __future__ import annotations

from typing import Any

from services.gap_service import update_gap_reasoning
from services.strategy_brain_service import build_strategy_report

GRAPH_NAME = "strategy_portfolio"


def run_strategy_portfolio(db_path: str, *, keyword: str, gap_id: int = 0) -> dict[str, Any]:
    report = build_strategy_report(db_path, keyword=keyword, gap_id=gap_id)
    if gap_id:
        lines = [f"- {a.title}: {a.reasoning}" for a in report.actions[:4]]
        update_gap_reasoning(db_path, gap_id, "\n".join(lines))
    return {
        "graph": GRAPH_NAME,
        "keyword": keyword,
        "gap_id": gap_id,
        "actions": [a.model_dump() for a in report.actions],
        "source": report.source,
    }
