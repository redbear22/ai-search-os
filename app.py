"""AI Search OS — Streamlit entry point."""

from __future__ import annotations

import importlib

import streamlit as st

from core.env_bootstrap import ensure_ssl_cert_bundle, load_dotenv_if_present

load_dotenv_if_present()
ensure_ssl_cert_bundle()

from core.settings import APP_TITLE, APP_VERSION
from core.site_context import get_active_db_path, init_site_session
from db.migrations import run_migrations
from ui.components.site_switcher import render_site_switcher

_SCREEN_MODULES = {
    "Dashboard": "ui.screens.screen_dashboard",
    "Opportunities": "ui.screens.screen_opportunities",
    "AI Answer Hub": "ui.screens.screen_ai_answer_hub",
    "Settings": "ui.screens.screen_settings",
}

NAV_ITEMS = list(_SCREEN_MODULES.keys())


@st.cache_resource
def _ensure_db_schema(db_path: str) -> None:
    run_migrations(db_path)


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, layout="wide")
    init_site_session()
    db_path = get_active_db_path()
    _ensure_db_schema(db_path)

    st.sidebar.title(APP_TITLE)
    st.sidebar.caption(APP_VERSION)
    render_site_switcher()

    page = st.sidebar.radio("Navigate", NAV_ITEMS)
    module = importlib.import_module(_SCREEN_MODULES[page])
    module.render()


if __name__ == "__main__":
    main()
