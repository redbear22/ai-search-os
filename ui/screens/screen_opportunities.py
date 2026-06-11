"""Opportunities / gap board."""

from __future__ import annotations

import streamlit as st

from core.site_context import get_active_db_path
from services.editorial_pipeline import create_gap_from_keyword, fill_gap
from services.gap_service import list_gaps


def render() -> None:
    db_path = get_active_db_path()
    st.header("Opportunities")
    st.caption("Gap board — rules-first editorial pipeline")

    with st.form("new_gap"):
        keyword = st.text_input("Keyword")
        priority = st.slider("Priority", 1, 100, 60)
        submitted = st.form_submit_button("Create gap")
        if submitted and keyword.strip():
            gap_id = create_gap_from_keyword(db_path, keyword=keyword.strip(), priority=priority)
            st.success(f"Created gap #{gap_id}")
            st.rerun()

    gaps = list_gaps(db_path)
    if not gaps:
        st.info("Create a gap to get started.")
        return

    for gap in gaps:
        with st.expander(f"#{gap['id']} · {gap['keyword']} · {gap['status']}"):
            st.write(gap.get("reasoning") or "_No reasoning yet_")
            if st.button("Fill gap", key=f"fill_{gap['id']}"):
                result = fill_gap(db_path, gap_id=gap["id"])
                st.success(f"Brief #{result['brief_id']} · {result['faq_count']} FAQs")
                st.rerun()
