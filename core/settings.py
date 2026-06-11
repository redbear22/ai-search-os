"""Global app settings."""

from __future__ import annotations

import json
import os
from pathlib import Path

APP_TITLE = "AI Search OS"
APP_VERSION = "0.1.0-starter"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = PROJECT_ROOT / "config"
SITES_REGISTRY_PATH = CONFIG_DIR / "sites_registry.json"


def load_sites_registry() -> dict:
    if not SITES_REGISTRY_PATH.is_file():
        return {"data_dir": str(PROJECT_ROOT / "data"), "sites": []}
    return json.loads(SITES_REGISTRY_PATH.read_text(encoding="utf-8"))


def get_site(site_id: str) -> dict | None:
    for site in load_sites_registry().get("sites", []):
        if site.get("id") == site_id:
            return site
    return None


def resolve_db_path_for_site(site_id: str) -> str:
    site = get_site(site_id)
    if not site:
        raise ValueError(f"Unknown site id: {site_id}")
    registry = load_sites_registry()
    data_dir = Path(registry.get("data_dir", PROJECT_ROOT / "data"))
    db_path = data_dir / site["db_file"]
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return str(db_path.resolve())


def default_site_id_from_env() -> str:
    return os.environ.get("ASOS_SITE_ID", "demo").strip() or "demo"


def resolve_db_path() -> str:
    env_path = os.environ.get("ASOS_DB_PATH", "").strip()
    if env_path:
        p = Path(env_path).expanduser()
        p.parent.mkdir(parents=True, exist_ok=True)
        return str(p.resolve())
    site_id = default_site_id_from_env()
    if get_site(site_id):
        return resolve_db_path_for_site(site_id)
    fallback = PROJECT_ROOT / "data" / "default.db"
    fallback.parent.mkdir(parents=True, exist_ok=True)
    return str(fallback.resolve())


DB_PATH = resolve_db_path()
