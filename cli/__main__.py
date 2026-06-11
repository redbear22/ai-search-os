"""CLI entry: python -m cli <command>"""

from __future__ import annotations

import sys


def main() -> int:
    print("AI Search OS CLI")
    print("Commands:")
    print("  python -m cli.ai_answer -k \"keyword\"")
    print("  python scripts/doctor.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
