"""Citation Engine content contracts — mirrors web/lib/citation-engine-client.ts."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ContentPayloadType(str, Enum):
    pitch = "pitch"
    article = "article"
    positioning = "positioning"
    review_response = "review_response"


class ContentPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: ContentPayloadType
    title: str
    body: str
    target_url: str | None = Field(default=None, alias="targetUrl")
    source_gap_id: str | None = Field(default=None, alias="sourceGapId")
    metadata: dict[str, Any] = Field(default_factory=dict)


class OutreachPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class OutreachTask(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    publication: str
    pitch: str
    contact_email: str | None = Field(default=None, alias="contactEmail")
    priority: OutreachPriority
    due_date: str = Field(alias="dueDate")
