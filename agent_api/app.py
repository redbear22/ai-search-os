"""FastAPI Agent API — default port 8787."""

from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import ValidationError

from contracts.citation_engine import ContentPayload, OutreachTask
from core.env_bootstrap import load_dotenv_if_present
from services.citation_content_service import save_content_to_citation_engine
from services.citation_outreach_service import save_outreach_task

load_dotenv_if_present()

app = FastAPI(title="AI Search OS Agent API", version="0.1.0")

API_KEY = os.getenv("AGENT_API_KEY", "").strip()


def _verify_api_key(x_api_key: str) -> None:
    if not API_KEY:
        raise HTTPException(503, "Agent API key not configured")
    if x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/jobs/content/create")
async def create_content(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, str]:
    _verify_api_key(x_api_key)

    data = await request.json()
    try:
        ContentPayload.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors()) from exc

    record_id = save_content_to_citation_engine(data)
    return {"status": "created", "id": record_id}


@app.post("/jobs/outreach/create")
async def create_outreach(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, str]:
    _verify_api_key(x_api_key)

    data = await request.json()
    try:
        OutreachTask.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors()) from exc

    record_id = save_outreach_task(data)
    return {"status": "created", "id": record_id}
