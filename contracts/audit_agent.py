"""Contracts for Phase 1 Audit Agent API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class AuditRunRequest(BaseModel):
    site_url: HttpUrl | str
    client_id: str | None = None
    created_by: str = Field(
        min_length=1,
        description="User id from Next.js session (FK to User table)",
    )


class AuditRunResponse(BaseModel):
    job_id: str
    status: str = "queued"


class AuditStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    stage: str | None = None
    error: str | None = None


class AuditResultResponse(BaseModel):
    job_id: str
    status: str
    audit: dict[str, int]
    gaps: list[dict[str, Any]]
