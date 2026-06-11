"""Persist citation-engine content payloads (rules-only, no LLM)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.settings import PROJECT_ROOT

CONTENT_QUEUE_DIR = PROJECT_ROOT / "data" / "citation_engine"
CONTENT_QUEUE_FILE = CONTENT_QUEUE_DIR / "content_queue.jsonl"


def save_content_to_citation_engine(data: dict[str, Any]) -> str:
    """Append a content payload to the JSONL queue; returns the record id."""
    record_id = str(uuid.uuid4())
    record = {
        "id": record_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payload": data,
    }
    CONTENT_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    with CONTENT_QUEUE_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record_id
