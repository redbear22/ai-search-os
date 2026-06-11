"""Brief synthesis graph."""

from __future__ import annotations

import json
from typing import Any

from db.connection import get_conn
from services.brief_synthesis_service import synthesize_brief

GRAPH_NAME = "brief_synthesis"


def run_brief_synthesis(db_path: str, *, keyword: str, gap_id: int = 0) -> dict[str, Any]:
    package = synthesize_brief(keyword, gap_id=gap_id, db_path=db_path)
    conn = get_conn(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO briefs (gap_id, keyword, status, outline_json, faq_json)
            VALUES (?, ?, 'ready', ?, ?)
            """,
            (
                gap_id or None,
                keyword,
                json.dumps([s.model_dump() for s in package.outline]),
                json.dumps(package.faq_priorities),
            ),
        )
        brief_id = int(cur.lastrowid)
        conn.commit()
    finally:
        conn.close()

    return {
        "graph": GRAPH_NAME,
        "keyword": keyword,
        "gap_id": gap_id,
        "brief_id": brief_id,
        "faq_count": len(package.faq_priorities),
        "source": package.source,
    }
