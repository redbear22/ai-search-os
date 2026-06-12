"""Query first User id for audit smoke test (no secrets printed)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
for line in (root / "web" / ".env.local").read_text(encoding="utf-8").splitlines():
    if line.startswith("DATABASE_URL="):
        val = line.split("=", 1)[1].strip().strip('"')
        os.environ["CITATION_DATABASE_URL"] = val
        break

from db.pg_connection import pg_conn

with pg_conn() as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT id, email FROM "User" LIMIT 3')
        rows = cur.fetchall()

if not rows:
    print("NO_USERS")
    sys.exit(1)

for row in rows:
    print(f"{row['id']}\t{row['email']}")
