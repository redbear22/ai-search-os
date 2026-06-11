"""CLI: python -m cli.ai_answer -k \"keyword\""""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from core.env_bootstrap import load_dotenv_if_present
from core.site_context import get_active_db_path
from db.migrations import run_migrations
from services.ai_answer_service import build_ai_answer_report, save_report

load_dotenv_if_present()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run AI Answer Hub for a keyword")
    parser.add_argument("-k", "--keyword", required=True)
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    db_path = get_active_db_path()
    run_migrations(db_path)
    report = build_ai_answer_report(args.keyword)
    print(f"keyword: {report.keyword}")
    print(f"source: {report.source}")
    for item in report.must_answer:
        print(f"  [{item.consensus}] {item.question}")

    if args.save:
        run_id = save_report(db_path, report)
        print(f"saved run #{run_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
