"""arq worker — runs audit jobs (separate Railway process)."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from db.audit_job_store import reclaim_stale_jobs, set_result, set_status
from db.pg_connection import make_pg_factory, pg_conn
from services.audit_agent_service import LAYERS, crawl, detect_gaps, score_layer


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
            set_status(conn, job_id, "RUNNING", progress=0, stage="crawling")

        delay = _test_delay_seconds()
        if delay:
            await asyncio.sleep(delay)

        pages = await crawl(site_url)

        with db_factory() as conn:
            set_status(
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
                set_status(
                    conn,
                    job_id,
                    "RUNNING",
                    progress=25 + (i + 1) * 15,
                    stage=f"scoring_{layer}",
                )

        gaps = detect_gaps(scores, pages)

        with db_factory() as conn:
            set_result(conn, job_id, scores, gaps)
    except Exception as exc:
        with db_factory() as conn:
            set_status(
                conn,
                job_id,
                "FAILED",
                stage="error",
                error=str(exc),
            )
        raise


async def on_startup(ctx: dict[str, Any]) -> None:
    ctx["db"] = make_pg_factory()
    with ctx["db"]() as conn:
        reclaimed = reclaim_stale_jobs(conn, stale_seconds=_stale_job_seconds())
    if reclaimed:
        print(f"[audit-worker] reclaimed {reclaimed} stale RUNNING job(s)")
