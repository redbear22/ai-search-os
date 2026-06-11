"""Dispatch graph runs by name."""

from __future__ import annotations

from typing import Any

from agents.graphs.brief_synthesis import GRAPH_NAME as BRIEF_GRAPH, run_brief_synthesis
from agents.graphs.research_keyword import GRAPH_NAME as RESEARCH_GRAPH, run_research_keyword
from agents.graphs.strategy_portfolio import GRAPH_NAME as STRATEGY_GRAPH, run_strategy_portfolio


def run_graph(graph_name: str, db_path: str, *, input_payload: dict[str, Any]) -> dict[str, Any]:
    if graph_name == RESEARCH_GRAPH:
        return run_research_keyword(
            db_path,
            keyword=str(input_payload.get("keyword") or ""),
            create_gap_flag=bool(input_payload.get("create_gap", True)),
        )
    if graph_name == STRATEGY_GRAPH:
        return run_strategy_portfolio(
            db_path,
            keyword=str(input_payload.get("keyword") or ""),
            gap_id=int(input_payload.get("gap_id") or 0),
        )
    if graph_name == BRIEF_GRAPH:
        return run_brief_synthesis(
            db_path,
            keyword=str(input_payload.get("keyword") or ""),
            gap_id=int(input_payload.get("gap_id") or 0),
        )
    raise ValueError(f"Unknown graph: {graph_name}")
