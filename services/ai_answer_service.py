"""AI Answer Hub — rules-first multi-engine intent synthesis."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from contracts.agentic_os import AIAnswerReport, UnifiedMustAnswer
from db.connection import get_conn

DEFAULT_ENGINES = ["google", "bing", "duckduckgo"]

QUESTION_PATTERNS = (
    r"^(what|how|why|when|where|who|which|can|does|is|are|should)\b",
    r"\?$",
)


def _looks_like_question(text: str) -> bool:
    t = text.strip().lower()
    if len(t) < 8:
        return False
    return any(re.search(p, t) for p in QUESTION_PATTERNS)


def _consensus_label(engine_count: int) -> str:
    if engine_count >= 3:
        return "critical"
    if engine_count == 2:
        return "high"
    return "medium"


def _rules_must_answer(keyword: str) -> list[UnifiedMustAnswer]:
    base = keyword.strip().lower()
    seeds = [
        f"What is the best {base}?",
        f"How do I choose a {base}?",
        f"Is {base} worth it?",
        f"What are common mistakes with {base}?",
        f"Who should skip {base}?",
    ]
    return [
        UnifiedMustAnswer(question=q, consensus="medium", engines=["rules"], priority_score=50 - i)
        for i, q in enumerate(seeds)
    ]


def _fetch_serpapi_questions(keyword: str, engines: list[str]) -> dict[str, list[str]]:
    api_key = os.environ.get("SERPAPI_KEY", "").strip()
    if not api_key:
        return {}

    import requests

    out: dict[str, list[str]] = {}
    for engine in engines:
        params = {
            "engine": engine,
            "q": keyword,
            "api_key": api_key,
        }
        try:
            resp = requests.get("https://serpapi.com/search.json", params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            continue

        questions: list[str] = []
        for item in data.get("related_questions") or []:
            q = str(item.get("question") or "").strip()
            if _looks_like_question(q):
                questions.append(q)
        for item in data.get("related_searches") or []:
            q = str(item.get("query") or "").strip()
            if _looks_like_question(q):
                questions.append(q)
        out[engine] = questions[:12]
    return out


def build_ai_answer_report(keyword: str, *, use_api: bool = True) -> AIAnswerReport:
    keyword = keyword.strip()
    if not keyword:
        return AIAnswerReport(keyword="", source="rules")

    engines = [
        e.strip()
        for e in os.environ.get("AI_INTENT_ENGINES", ",".join(DEFAULT_ENGINES)).split(",")
        if e.strip()
    ]

    engine_hits = _fetch_serpapi_questions(keyword, engines) if use_api else {}
    if not engine_hits:
        return AIAnswerReport(keyword=keyword, must_answer=_rules_must_answer(keyword), source="rules")

    tally: dict[str, dict[str, Any]] = {}
    for engine, questions in engine_hits.items():
        for q in questions:
            key = q.lower()
            if key not in tally:
                tally[key] = {"question": q, "engines": []}
            if engine not in tally[key]["engines"]:
                tally[key]["engines"].append(engine)

    must_answer: list[UnifiedMustAnswer] = []
    for entry in tally.values():
        count = len(entry["engines"])
        must_answer.append(
            UnifiedMustAnswer(
                question=entry["question"],
                consensus=_consensus_label(count),
                engines=entry["engines"],
                priority_score=float(count * 25),
            )
        )

    must_answer.sort(key=lambda x: x.priority_score, reverse=True)
    if not must_answer:
        must_answer = _rules_must_answer(keyword)

    return AIAnswerReport(
        keyword=keyword,
        must_answer=must_answer[:12],
        source="serpapi" if engine_hits else "rules",
        detail={"engines_queried": list(engine_hits.keys())},
    )


def save_report(db_path: str, report: AIAnswerReport) -> int:
    conn = get_conn(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO multi_engine_intent_runs (keyword, report_json, source)
            VALUES (?, ?, ?)
            """,
            (report.keyword, report.model_dump_json(), report.source),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def load_latest_report(db_path: str, keyword: str) -> dict[str, Any] | None:
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            """
            SELECT * FROM multi_engine_intent_runs
            WHERE keyword = ?
            ORDER BY id DESC LIMIT 1
            """,
            (keyword.strip(),),
        ).fetchone()
        if not row:
            return None
        data = dict(row)
        data["report"] = json.loads(data.pop("report_json"))
        return data
    finally:
        conn.close()
