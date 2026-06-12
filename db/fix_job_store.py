"""Postgres store for FixJob rows (Prisma-owned schema, Python reader/writer)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

TABLE = "fix_jobs"

VALID_STATUSES = frozenset(
    {"QUEUED", "RUNNING", "NEEDS_APPROVAL", "DONE", "FAILED"}
)
TERMINAL_RESULT_STATUSES = frozenset({"NEEDS_APPROVAL", "DONE"})


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(
    conn: psycopg.Connection,
    *,
    job_id: str,
    site_url: str,
    client_id: str | None,
    gap_id: str | None,
    created_by: str,
    gaps_input: list[dict[str, Any]],
) -> dict[str, Any]:
    now = _utc_now()
    conn.execute(
        f"""
        INSERT INTO {TABLE} (
            id, site_url, client_id, gap_id, status, progress, stage, error,
            input, result, created_by, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, 'QUEUED', 0, NULL, NULL,
            %s, NULL, %s, %s, %s
        )
        """,
        (
            job_id,
            site_url,
            client_id,
            gap_id,
            Jsonb({"gaps": gaps_input}),
            created_by,
            now,
            now,
        ),
    )
    conn.commit()
    row = get_job(conn, job_id)
    if row is None:
        raise RuntimeError(f"Failed to create fix job {job_id}")
    return row


def set_status(
    conn: psycopg.Connection,
    job_id: str,
    status: str,
    *,
    progress: int | None = None,
    stage: str | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    status_upper = status.upper()
    if status_upper not in VALID_STATUSES:
        raise ValueError(f"Invalid fix job status: {status}")

    fields: list[str] = ["status = %s", "updated_at = %s"]
    params: list[Any] = [status_upper, _utc_now()]

    if progress is not None:
        fields.append("progress = %s")
        params.append(max(0, min(100, progress)))
    if stage is not None:
        fields.append("stage = %s")
        params.append(stage)
    if error is not None:
        fields.append("error = %s")
        params.append(error)

    params.append(job_id)
    conn.execute(
        f"UPDATE {TABLE} SET {', '.join(fields)} WHERE id = %s",
        params,
    )
    conn.commit()
    row = get_job(conn, job_id)
    if row is None:
        raise RuntimeError(f"Fix job not found: {job_id}")
    return row


def set_result(
    conn: psycopg.Connection,
    job_id: str,
    fixes: list[dict[str, Any]],
    *,
    approved: bool = False,
) -> dict[str, Any]:
    payload = {"fixes": fixes}
    status = "DONE" if approved else "NEEDS_APPROVAL"
    stage = "complete" if approved else "awaiting_approval"
    now = _utc_now()
    conn.execute(
        f"""
        UPDATE {TABLE}
        SET status = %s,
            progress = 100,
            stage = %s,
            result = %s,
            error = NULL,
            updated_at = %s
        WHERE id = %s
        """,
        (status, stage, Jsonb(payload), now, job_id),
    )
    conn.commit()
    row = get_job(conn, job_id)
    if row is None:
        raise RuntimeError(f"Fix job not found: {job_id}")
    return row


def get_job(conn: psycopg.Connection, job_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        f"""
        SELECT id, site_url, client_id, gap_id, status, progress, stage, error,
               input, result, created_by, created_at, updated_at
        FROM {TABLE}
        WHERE id = %s
        """,
        (job_id,),
    ).fetchone()
    if row is None:
        return None
    return _normalize_row(dict(row))


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    for key in ("input", "result"):
        value = row.get(key)
        if isinstance(value, str):
            row[key] = json.loads(value)
    status = row.get("status")
    if hasattr(status, "value"):
        row["status"] = status.value
    elif status is not None:
        row["status"] = str(status)
    return row


def status_for_api(status: str) -> str:
    return str(status).lower()


def result_ready(status: str) -> bool:
    return str(status).upper() in TERMINAL_RESULT_STATUSES


def reclaim_stale_jobs(
    conn: psycopg.Connection,
    *,
    stale_seconds: int = 300,
) -> int:
    """Re-queue fix jobs stuck in RUNNING after worker death."""
    seconds = max(60, int(stale_seconds))
    now = _utc_now()
    cutoff = now - timedelta(seconds=seconds)
    cur = conn.execute(
        f"""
        UPDATE {TABLE}
        SET status = 'QUEUED',
            stage = 'reclaimed_after_restart',
            progress = 0,
            error = NULL,
            updated_at = %s
        WHERE status = 'RUNNING'
          AND updated_at < %s
        """,
        (now, cutoff),
    )
    conn.commit()
    return int(cur.rowcount or 0)
