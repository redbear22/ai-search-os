from pathlib import Path

from db.migrations import run_migrations
from db.connection import get_conn


def test_migrations_apply(tmp_path: Path):
    db_path = str(tmp_path / "test.db")
    run_migrations(db_path)
    conn = get_conn(db_path)
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "content_gaps" in tables
        assert "agent_jobs" in tables
    finally:
        conn.close()
