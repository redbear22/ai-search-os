"""Active site context for UI and workers."""

from __future__ import annotations

import json
import os
from pathlib import Path

from core.settings import PROJECT_ROOT, default_site_id_from_env, get_site, resolve_db_path_for_site

ACTIVE_SITE_FILE = PROJECT_ROOT / ".ce" / "active_site.json"


def get_active_site_id() -> str:
    if ACTIVE_SITE_FILE.is_file():
        try:
            data = json.loads(ACTIVE_SITE_FILE.read_text(encoding="utf-8"))
            sid = str(data.get("site_id") or "").strip()
            if sid and get_site(sid):
                return sid
        except Exception:
            pass
    return default_site_id_from_env()


def get_active_db_path() -> str:
    env_path = os.environ.get("ASOS_DB_PATH", "").strip()
    if env_path:
        return str(Path(env_path).expanduser().resolve())
    return resolve_db_path_for_site(get_active_site_id())


def set_active_site(site_id: str) -> str:
    site = get_site(site_id)
    if not site:
        raise ValueError(f"Unknown site: {site_id}")
    ACTIVE_SITE_FILE.parent.mkdir(parents=True, exist_ok=True)
    db_path = resolve_db_path_for_site(site_id)
    ACTIVE_SITE_FILE.write_text(
        json.dumps({"site_id": site_id, "db_path": db_path}, indent=2),
        encoding="utf-8",
    )
    os.environ["ASOS_SITE_ID"] = site_id
    os.environ["ASOS_DB_PATH"] = db_path
    return db_path


def init_site_session() -> dict:
    site_id = get_active_site_id()
    site = get_site(site_id) or {"id": site_id, "name": site_id, "domain": ""}
    return {"site_id": site_id, "site": site, "db_path": get_active_db_path()}
