"""Content gap CRUD."""

from __future__ import annotations

import json
from typing import Any

from db.connection import get_conn


def list_gaps(db_path: str, *, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    conn = get_conn(db_path)
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM content_gaps WHERE status = ? ORDER BY priority DESC, id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM content_gaps ORDER BY priority DESC, id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_gap(db_path: str, *, keyword: str, priority: int = 50, reasoning: str = "", source: str = "manual") -> int:
    conn = get_conn(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO content_gaps (keyword, priority, reasoning, source)
            VALUES (?, ?, ?, ?)
            """,
            (keyword.strip(), priority, reasoning, source),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def update_gap_reasoning(db_path: str, gap_id: int, reasoning: str) -> None:
    conn = get_conn(db_path)
    try:
        conn.execute(
            "UPDATE content_gaps SET reasoning = ?, updated_at = datetime('now') WHERE id = ?",
            (reasoning, gap_id),
        )
        conn.commit()
    finally:
        conn.close()
