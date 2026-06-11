"""AI Answer Hub screen."""

from __future__ import annotations

import streamlit as st

from core.site_context import get_active_db_path
from services.ai_answer_service import build_ai_answer_report, save_report
from services.agent_job_service import enqueue_job


def render() -> None:
    db_path = get_active_db_path()
    st.header("AI Answer Hub")
    st.caption("Multi-engine must-answer synthesis (rules fallback without SERPAPI_KEY)")

    keyword = st.text_input("Keyword", placeholder="best home espresso machine")
    col1, col2 = st.columns(2)
    run = col1.button("Run intent", type="primary")
    save = col2.button("Save report")

    if run and keyword.strip():
        report = build_ai_answer_report(keyword.strip())
        st.session_state["last_ai_answer"] = report
        if save:
            run_id = save_report(db_path, report)
            st.success(f"Saved run #{run_id}")

    report = st.session_state.get("last_ai_answer")
    if report:
        st.write(f"**Source:** {report.source}")
        for item in report.must_answer:
            st.markdown(f"- **[{item.consensus}]** {item.question}")

        if st.button("Enqueue research job"):
            job_id = enqueue_job(
                db_path,
                graph_name="research_keyword",
                input_payload={"keyword": report.keyword, "create_gap": True},
            )
            st.success(f"Queued job #{job_id}")
