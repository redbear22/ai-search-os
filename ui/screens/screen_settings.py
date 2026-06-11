"""Settings screen."""

from __future__ import annotations

import json
from pathlib import Path

import streamlit as st

from core.settings import CONFIG_DIR, PROJECT_ROOT
from core.site_context import get_active_db_path, init_site_session


def render() -> None:
    ctx = init_site_session()
    st.header("Settings")

    st.subheader("Active site")
    st.json(ctx)

    st.subheader("Environment")
    st.code(
        "\n".join(
            [
                f"ASOS_SITE_ID={ctx['site_id']}",
                f"ASOS_DB_PATH={get_active_db_path()}",
                "SERPAPI_KEY=(set in .env for live SERP)",
                "OPENAI_API_KEY=(optional — rules mode works offline)",
            ]
        )
    )

    modules_path = CONFIG_DIR / "modules.json"
    if modules_path.is_file():
        st.subheader("Modules")
        st.json(json.loads(modules_path.read_text(encoding="utf-8")))

    st.subheader("Paths")
    st.write({"project_root": str(PROJECT_ROOT), "config": str(CONFIG_DIR)})
