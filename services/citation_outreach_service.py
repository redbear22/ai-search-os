"""Persist citation-engine outreach tasks (rules-only, no LLM)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.settings import PROJECT_ROOT

OUTREACH_QUEUE_DIR = PROJECT_ROOT / "data" / "citation_engine"
OUTREACH_QUEUE_FILE = OUTREACH_QUEUE_DIR / "outreach_queue.jsonl"


def save_outreach_task(data: dict[str, Any]) -> str:
    """Append an outreach task to the JSONL queue; returns the record id."""
    record_id = str(uuid.uuid4())
    record = {
        "id": record_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "task": data,
    }
    OUTREACH_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    with OUTREACH_QUEUE_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record_id
