#!/usr/bin/env python3
"""Poll agent_jobs queue and run graphs."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from core.env_bootstrap import load_dotenv_if_present
from core.site_context import get_active_db_path
from db.migrations import run_migrations

load_dotenv_if_present()

POLL_SECONDS = int(os.environ.get("AGENT_WORKER_POLL_SECONDS", "30"))


def main() -> int:
    from agents.runner import run_graph
    from services.agent_job_service import claim_next_job, complete_job

    db_path = get_active_db_path()
    run_migrations(db_path)
    print(f"agent_worker | db {db_path} | poll {POLL_SECONDS}s")

    while True:
        job = claim_next_job(db_path)
        if not job:
            time.sleep(POLL_SECONDS)
            continue
        try:
            output = run_graph(job["graph_name"], db_path, input_payload=job["input"])
            complete_job(db_path, job["id"], output=output)
            print(f"completed job #{job['id']} ({job['graph_name']})")
        except Exception as exc:
            complete_job(db_path, job["id"], output={}, error=str(exc))
            print(f"failed job #{job['id']}: {exc}")


if __name__ == "__main__":
    raise SystemExit(main())
