"""arq worker — runs audit and fix jobs (separate Railway process)."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from db.audit_job_store import reclaim_stale_jobs as reclaim_stale_audit_jobs
from db.audit_job_store import set_result as set_audit_result
from db.audit_job_store import set_status as set_audit_status
from db.fix_job_store import get_job as get_fix_job
from db.fix_job_store import reclaim_stale_jobs as reclaim_stale_fix_jobs
from db.fix_job_store import set_result as set_fix_result
from db.fix_job_store import set_status as set_fix_status
from db.pg_connection import make_pg_factory, pg_conn
from services.audit_agent_service import LAYERS, crawl, detect_gaps, score_layer
from services.fix_agent_service import generate_fixes


def _test_delay_seconds() -> int:
    raw = os.getenv("AUDIT_TEST_DELAY_SEC", "0").strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return 0


def _stale_job_seconds() -> int:
    raw = os.getenv("AUDIT_STALE_JOB_SEC", "300").strip()
    try:
        return max(60, int(raw))
    except ValueError:
        return 300


async def run_audit(
    ctx: dict[str, Any],
    job_id: str,
    site_url: str,
    client_id: str | None = None,
) -> None:
    db_factory = ctx.get("db") or pg_conn
    try:
        with db_factory() as conn:
            set_audit_status(conn, job_id, "RUNNING", progress=0, stage="crawling")

        delay = _test_delay_seconds()
        if delay:
            await asyncio.sleep(delay)

        pages = await crawl(site_url)

        with db_factory() as conn:
            set_audit_status(
                conn,
                job_id,
                "RUNNING",
                progress=25,
                stage="scoring_discoverability",
            )

        scores: dict[str, int] = {}
        for i, layer in enumerate(LAYERS):
            scores[layer] = score_layer(layer, pages)
            with db_factory() as conn:
                set_audit_status(
                    conn,
                    job_id,
                    "RUNNING",
                    progress=25 + (i + 1) * 15,
                    stage=f"scoring_{layer}",
                )

        gaps = detect_gaps(scores, pages)

        with db_factory() as conn:
            set_audit_result(conn, job_id, scores, gaps)
    except Exception as exc:
        with db_factory() as conn:
            set_audit_status(
                conn,
                job_id,
                "FAILED",
                stage="error",
                error=str(exc),
            )
        raise


async def run_fix(
    ctx: dict[str, Any],
    job_id: str,
    site_url: str,
    client_id: str | None = None,
) -> None:
    db_factory = ctx.get("db") or pg_conn
    try:
        with db_factory() as conn:
            row = get_fix_job(conn, job_id)
            if row is None:
                raise RuntimeError(f"Fix job not found: {job_id}")
            input_payload = row.get("input") or {}
            gaps = input_payload.get("gaps") or []
            set_fix_status(conn, job_id, "RUNNING", progress=0, stage="analyzing_gaps")

        delay = _test_delay_seconds()
        if delay:
            await asyncio.sleep(delay)

        if not gaps:
            raise ValueError("Fix job has no gaps to process")

        fixes: list[dict[str, Any]] = []
        total = len(gaps)
        for i, gap in enumerate(gaps):
            fixes.append(generate_fixes([gap], site_url)[0])
            progress = 20 + int(((i + 1) / total) * 70)
            with db_factory() as conn:
                set_fix_status(
                    conn,
                    job_id,
                    "RUNNING",
                    progress=progress,
                    stage=f"generating_fix_{i + 1}_of_{total}",
                )

        with db_factory() as conn:
            set_fix_status(conn, job_id, "RUNNING", progress=95, stage="staging_for_approval")
            set_fix_result(conn, job_id, fixes, approved=False)
    except Exception as exc:
        with db_factory() as conn:
            set_fix_status(
                conn,
                job_id,
                "FAILED",
                stage="error",
                error=str(exc),
            )
        raise


async def on_startup(ctx: dict[str, Any]) -> None:
    ctx["db"] = make_pg_factory()
    stale_seconds = _stale_job_seconds()
    with ctx["db"]() as conn:
        audit_reclaimed = reclaim_stale_audit_jobs(conn, stale_seconds=stale_seconds)
        fix_reclaimed = reclaim_stale_fix_jobs(conn, stale_seconds=stale_seconds)
    if audit_reclaimed:
        print(f"[agent-worker] reclaimed {audit_reclaimed} stale audit job(s)")
    if fix_reclaimed:
        print(f"[agent-worker] reclaimed {fix_reclaimed} stale fix job(s)")
