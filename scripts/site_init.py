#!/usr/bin/env python3
"""Initialize a site database."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from core.env_bootstrap import load_dotenv_if_present
from core.settings import get_site, resolve_db_path_for_site
from core.site_context import set_active_site
from db.migrations import run_migrations

load_dotenv_if_present()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="demo")
    args = parser.parse_args()

    if not get_site(args.site):
        print(f"Unknown site: {args.site}")
        return 1

    db_path = set_active_site(args.site)
    run_migrations(db_path)
    print(f"Initialized site '{args.site}' at {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
