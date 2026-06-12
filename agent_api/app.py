"""FastAPI Agent API — default port 8787."""

from __future__ import annotations

import asyncio
import os
import uuid

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import ValidationError

from agent_api.worker import run_audit, run_fix
from contracts.audit_agent import AuditRunRequest
from contracts.fix_agent import FixRunRequest
from contracts.citation_engine import ContentPayload, OutreachTask
from core.env_bootstrap import load_dotenv_if_present
from db.audit_job_store import get_job as get_audit_job
from db.audit_job_store import status_for_api as audit_status_for_api
from db.fix_job_store import get_job as get_fix_job
from db.fix_job_store import result_ready as fix_result_ready
from db.fix_job_store import status_for_api as fix_status_for_api
from db.pg_connection import make_pg_factory, pg_conn, postgres_enabled
from services.citation_content_service import save_content_to_citation_engine
from services.citation_outreach_service import save_outreach_task

load_dotenv_if_present()

app = FastAPI(title="AI Search OS Agent API", version="0.1.0")

API_KEY = os.getenv("AGENT_API_KEY", "").strip()
REDIS_URL = os.getenv("REDIS_URL", "").strip()


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


@app.post("/agents/audit/run", status_code=202)
async def audit_run(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, str]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for audit jobs")

    data = await request.json()
    try:
        body = AuditRunRequest.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors()) from exc

    job_id = str(uuid.uuid4())
    site_url = str(body.site_url)

    from db.audit_job_store import create_job

    with pg_conn() as conn:
        create_job(
            conn,
            job_id=job_id,
            site_url=site_url,
            client_id=body.client_id,
            created_by=body.created_by,
        )

    if REDIS_URL:
        redis = await create_pool(RedisSettings.from_dsn(REDIS_URL))
        try:
            await redis.enqueue_job("run_audit", job_id, site_url, body.client_id)
        finally:
            await redis.aclose()
    else:
        ctx = {"db": make_pg_factory()}
        asyncio.create_task(run_audit(ctx, job_id, site_url, body.client_id))

    return {"job_id": job_id, "status": "queued"}


@app.get("/agents/audit/status/{job_id}")
async def audit_status(
    job_id: str,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, object]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for audit jobs")

    with pg_conn() as conn:
        row = get_audit_job(conn, job_id)
    if row is None:
        raise HTTPException(404, "Audit job not found")

    return {
        "job_id": row["id"],
        "status": audit_status_for_api(row["status"]),
        "progress": int(row.get("progress") or 0),
        "stage": row.get("stage"),
        "error": row.get("error"),
    }


@app.get("/agents/audit/result/{job_id}")
async def audit_result(
    job_id: str,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, object]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for audit jobs")

    with pg_conn() as conn:
        row = get_audit_job(conn, job_id)
    if row is None:
        raise HTTPException(404, "Audit job not found")

    status = audit_status_for_api(row["status"])
    if status == "failed":
        raise HTTPException(
            409,
            detail={"job_id": job_id, "status": status, "error": row.get("error")},
        )
    if status != "done":
        raise HTTPException(
            409,
            detail={"job_id": job_id, "status": status, "message": "Job not finished"},
        )

    result = row.get("result") or {}
    audit = result.get("audit") or {}
    gaps = result.get("gaps") or []
    return {
        "job_id": row["id"],
        "status": status,
        "audit": audit,
        "gaps": gaps,
    }


@app.post("/agents/fix/run", status_code=202)
async def fix_run(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, str]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for fix jobs")

    data = await request.json()
    try:
        body = FixRunRequest.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors()) from exc

    job_id = str(uuid.uuid4())
    site_url = str(body.site_url)
    gaps_input = [gap.model_dump() for gap in body.gaps]

    from db.fix_job_store import create_job

    with pg_conn() as conn:
        create_job(
            conn,
            job_id=job_id,
            site_url=site_url,
            client_id=body.client_id,
            gap_id=body.gap_id,
            created_by=body.created_by,
            gaps_input=gaps_input,
        )

    if REDIS_URL:
        redis = await create_pool(RedisSettings.from_dsn(REDIS_URL))
        try:
            await redis.enqueue_job("run_fix", job_id, site_url, body.client_id)
        finally:
            await redis.aclose()
    else:
        ctx = {"db": make_pg_factory()}
        asyncio.create_task(run_fix(ctx, job_id, site_url, body.client_id))

    return {"job_id": job_id, "status": "queued"}


@app.get("/agents/fix/status/{job_id}")
async def fix_status(
    job_id: str,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, object]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for fix jobs")

    with pg_conn() as conn:
        row = get_fix_job(conn, job_id)
    if row is None:
        raise HTTPException(404, "Fix job not found")

    return {
        "job_id": row["id"],
        "status": fix_status_for_api(row["status"]),
        "progress": int(row.get("progress") or 0),
        "stage": row.get("stage"),
        "error": row.get("error"),
    }


@app.get("/agents/fix/result/{job_id}")
async def fix_result(
    job_id: str,
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict[str, object]:
    _verify_api_key(x_api_key)

    if not postgres_enabled():
        raise HTTPException(503, "Postgres not configured for fix jobs")

    with pg_conn() as conn:
        row = get_fix_job(conn, job_id)
    if row is None:
        raise HTTPException(404, "Fix job not found")

    status = fix_status_for_api(row["status"])
    if status == "failed":
        raise HTTPException(
            409,
            detail={"job_id": job_id, "status": status, "error": row.get("error")},
        )
    if not fix_result_ready(row["status"]):
        raise HTTPException(
            409,
            detail={"job_id": job_id, "status": status, "message": "Job not finished"},
        )

    result = row.get("result") or {}
    fixes = result.get("fixes") or []
    return {
        "job_id": row["id"],
        "status": status,
        "fixes": fixes,
    }
