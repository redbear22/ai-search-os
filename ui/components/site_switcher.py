"""Sidebar site switcher."""

from __future__ import annotations

import streamlit as st

from core.settings import load_sites_registry
from core.site_context import get_active_site_id, set_active_site


def render_site_switcher() -> None:
    registry = load_sites_registry()
    sites = registry.get("sites", [])
    if not sites:
        st.sidebar.warning("No sites in config/sites_registry.json")
        return

    ids = [s["id"] for s in sites]
    labels = {s["id"]: f"{s.get('name', s['id'])} ({s.get('domain', '')})" for s in sites}
    current = get_active_site_id()
    idx = ids.index(current) if current in ids else 0

    choice = st.sidebar.selectbox(
        "Active site",
        options=ids,
        index=idx,
        format_func=lambda sid: labels.get(sid, sid),
        key="site_switcher",
    )
    if choice != current:
        set_active_site(choice)
        st.rerun()
