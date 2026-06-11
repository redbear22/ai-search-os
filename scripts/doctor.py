#!/usr/bin/env python3
"""Health check for AI Search OS starter."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from core.env_bootstrap import load_dotenv_if_present

load_dotenv_if_present()

ERRORS: list[str] = []


def need(mod: str) -> None:
    try:
        importlib.import_module(mod)
    except Exception as exc:
        ERRORS.append(f"import {mod}: {exc}")


def main() -> int:
    print(f"doctor | repo {REPO}")
    for mod in (
        "pydantic",
        "streamlit",
        "contracts.agentic_os",
        "agents.runner",
        "services.ai_answer_service",
        "services.editorial_pipeline",
        "db.migrations",
    ):
        need(mod)

    db_path = str(REPO / ".tmp" / "doctor_smoke.db")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    if Path(db_path).is_file():
        Path(db_path).unlink()

    try:
        from db.migrations import run_migrations
        from agents.runner import run_graph
        from services.ai_answer_service import build_ai_answer_report

        run_migrations(db_path)
        report = build_ai_answer_report("demo keyword", use_api=False)
        assert report.must_answer
        out = run_graph("research_keyword", db_path, input_payload={"keyword": "demo keyword", "create_gap": False})
        assert out["graph"] == "research_keyword"
    except Exception as exc:
        ERRORS.append(f"smoke: {exc}")

    if ERRORS:
        print("doctor: FAILED")
        for line in ERRORS:
            print(" -", line)
        return 1
    print("doctor: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
