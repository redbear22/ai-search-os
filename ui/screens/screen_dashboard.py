"""Dashboard screen."""

from __future__ import annotations

import streamlit as st

from core.site_context import init_site_session
from services.agent_job_service import list_jobs
from services.gap_service import list_gaps


def render() -> None:
    ctx = init_site_session()
    st.header("Dashboard")
    st.caption(f"Site: {ctx['site'].get('name')} · DB: `{ctx['db_path']}`")

    gaps = list_gaps(ctx["db_path"], status="open", limit=10)
    jobs = list_jobs(ctx["db_path"], limit=5)

    col1, col2, col3 = st.columns(3)
    col1.metric("Open gaps", len(gaps))
    col2.metric("Recent jobs", len(jobs))
    col3.metric("Version", "0.1.0-starter")

    st.subheader("Open gaps")
    if gaps:
        st.dataframe(gaps, use_container_width=True, hide_index=True)
    else:
        st.info("No open gaps yet. Use AI Answer Hub or Opportunities to create one.")

    st.subheader("Recent agent jobs")
    if jobs:
        st.dataframe(
            [{"id": j["id"], "graph": j["graph_name"], "status": j["status"]} for j in jobs],
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No agent jobs yet.")
