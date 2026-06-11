"""Editorial pipeline — gap → intent → brief."""

from __future__ import annotations

import json
from typing import Any

from db.connection import get_conn
from services.ai_answer_service import build_ai_answer_report, save_report
from services.brief_synthesis_service import synthesize_brief
from services.gap_service import create_gap, update_gap_reasoning


def fill_gap(db_path: str, *, gap_id: int) -> dict[str, Any]:
    conn = get_conn(db_path)
    try:
        row = conn.execute("SELECT * FROM content_gaps WHERE id = ?", (gap_id,)).fetchone()
        if not row:
            raise ValueError(f"Gap {gap_id} not found")
        gap = dict(row)
    finally:
        conn.close()

    keyword = gap["keyword"]
    report = build_ai_answer_report(keyword, use_api=True)
    run_id = save_report(db_path, report)
    package = synthesize_brief(keyword, gap_id=gap_id, db_path=db_path)

    conn = get_conn(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO briefs (gap_id, keyword, status, outline_json, faq_json)
            VALUES (?, ?, 'ready', ?, ?)
            """,
            (
                gap_id,
                keyword,
                json.dumps([s.model_dump() for s in package.outline]),
                json.dumps(package.faq_priorities),
            ),
        )
        brief_id = int(cur.lastrowid)
        conn.execute(
            "UPDATE content_gaps SET status = 'briefed', updated_at = datetime('now') WHERE id = ?",
            (gap_id,),
        )
        conn.commit()
    finally:
        conn.close()

    reasoning = f"AI Answer run #{run_id}; brief #{brief_id}; {len(package.faq_priorities)} FAQs."
    update_gap_reasoning(db_path, gap_id, reasoning)

    return {
        "gap_id": gap_id,
        "brief_id": brief_id,
        "intent_run_id": run_id,
        "faq_count": len(package.faq_priorities),
        "source": package.source,
    }


def create_gap_from_keyword(db_path: str, *, keyword: str, priority: int = 60) -> int:
    return create_gap(db_path, keyword=keyword, priority=priority, source="pipeline")
