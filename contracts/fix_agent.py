"""Contracts for Phase 2 Fix Agent API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class GapInput(BaseModel):
    layer: str = Field(min_length=1)
    issue: str = Field(min_length=1)
    severity: str = "medium"
    fix_hint: str = ""


class FixRunRequest(BaseModel):
    site_url: HttpUrl | str
    client_id: str | None = None
    created_by: str = Field(
        min_length=1,
        description="User id from Next.js session (FK to User table)",
    )
    gap_id: str | None = None
    gaps: list[GapInput] = Field(min_length=1)


class FixRunResponse(BaseModel):
    job_id: str
    status: str = "queued"


class FixStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    stage: str | None = None
    error: str | None = None


class FixResultResponse(BaseModel):
    job_id: str
    status: str
    fixes: list[dict[str, Any]]
