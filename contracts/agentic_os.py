"""Agentic OS contracts — strategy, synthesis, refresh, linking, QA."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ActionKind(str, Enum):
    write_new = "write_new"
    refresh_meta = "refresh_meta"
    expand_faqs = "expand_faqs"
    competitive_improve = "competitive_improve"
    internal_link_hub = "internal_link_hub"
    run_audit = "run_audit"
    run_ai_answer = "run_ai_answer"
    qa_remediate = "qa_remediate"
    monitor = "monitor"


class StrategyAction(BaseModel):
    kind: ActionKind = ActionKind.monitor
    priority: int = Field(default=50, ge=0, le=100)
    title: str = ""
    reasoning: str = ""
    acceptance_criteria: list[str] = Field(default_factory=list)
    auto_safe: bool = False


class StrategyPortfolioReport(BaseModel):
    keyword: str = ""
    gap_id: int = 0
    source: str = "rules"
    actions: list[StrategyAction] = Field(default_factory=list)
    context_summary: str = ""


class BriefSectionPlan(BaseModel):
    title: str
    bullets: list[str] = Field(default_factory=list)


class BriefSynthesisPackage(BaseModel):
    keyword: str = ""
    gap_id: int = 0
    decision: str = "new_post"
    differentiation_thesis: str = ""
    outline: list[BriefSectionPlan] = Field(default_factory=list)
    faq_priorities: list[str] = Field(default_factory=list)
    source: str = "rules"


class UnifiedMustAnswer(BaseModel):
    question: str
    consensus: str = "medium"
    engines: list[str] = Field(default_factory=list)
    priority_score: float = 0.0


class AIAnswerReport(BaseModel):
    keyword: str = ""
    must_answer: list[UnifiedMustAnswer] = Field(default_factory=list)
    source: str = "rules"
    detail: dict[str, Any] = Field(default_factory=dict)
