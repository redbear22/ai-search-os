from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from db.fix_job_store import reclaim_stale_jobs


def test_reclaim_stale_fix_jobs_returns_rowcount() -> None:
    conn = MagicMock()
    result = MagicMock()
    result.rowcount = 1
    conn.execute.return_value = result

    count = reclaim_stale_jobs(conn, stale_seconds=300)

    assert count == 1
    conn.execute.assert_called_once()
    conn.commit.assert_called_once()
    sql = conn.execute.call_args[0][0]
    assert "reclaimed_after_restart" in sql
    assert "RUNNING" in sql
    params = conn.execute.call_args[0][1]
    now, cutoff = params
    assert isinstance(now, datetime)
    assert isinstance(cutoff, datetime)
    assert now - cutoff == timedelta(seconds=300)
