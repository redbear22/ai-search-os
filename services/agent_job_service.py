"""Agent job queue."""

from __future__ import annotations

import json
from typing import Any

from db.connection import get_conn


def enqueue_job(db_path: str, *, graph_name: str, input_payload: dict[str, Any]) -> int:
    conn = get_conn(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO agent_jobs (graph_name, status, input_json)
            VALUES (?, 'queued', ?)
            """,
            (graph_name, json.dumps(input_payload)),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def claim_next_job(db_path: str) -> dict[str, Any] | None:
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            "SELECT * FROM agent_jobs WHERE status = 'queued' ORDER BY id ASC LIMIT 1"
        ).fetchone()
        if not row:
            return None
        job = dict(row)
        conn.execute(
            "UPDATE agent_jobs SET status = 'running' WHERE id = ?",
            (job["id"],),
        )
        conn.commit()
        job["input"] = json.loads(job.pop("input_json") or "{}")
        return job
    finally:
        conn.close()


def complete_job(db_path: str, job_id: int, *, output: dict[str, Any], error: str = "") -> None:
    conn = get_conn(db_path)
    try:
        status = "failed" if error else "completed"
        conn.execute(
            """
            UPDATE agent_jobs
            SET status = ?, output_json = ?, error = ?, completed_at = datetime('now')
            WHERE id = ?
            """,
            (status, json.dumps(output), error, job_id),
        )
        conn.commit()
    finally:
        conn.close()


def list_jobs(db_path: str, *, limit: int = 50) -> list[dict[str, Any]]:
    conn = get_conn(db_path)
    try:
        rows = conn.execute(
            "SELECT * FROM agent_jobs ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        out = []
        for row in rows:
            job = dict(row)
            job["input"] = json.loads(job.pop("input_json") or "{}")
            job["output"] = json.loads(job.pop("output_json") or "{}")
            out.append(job)
        return out
    finally:
        conn.close()
