"""Print audit_jobs row status for a job id (no secrets)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
for line in (root / "web" / ".env.local").read_text(encoding="utf-8").splitlines():
    if line.startswith("DATABASE_URL="):
        os.environ["CITATION_DATABASE_URL"] = line.split("=", 1)[1].strip().strip('"')
        break

sys.path.insert(0, str(root))
from db.pg_connection import pg_conn

job_id = sys.argv[1]
with pg_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, status, progress, stage, error FROM audit_jobs WHERE id = %s",
            (job_id,),
        )
        row = cur.fetchone()
if not row:
    print("NOT_FOUND")
    sys.exit(1)
print(
    f"id={row['id']} status={row['status']} progress={row['progress']} stage={row['stage']} error={row['error']}"
)
