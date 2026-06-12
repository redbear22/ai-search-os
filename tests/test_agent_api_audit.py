from __future__ import annotations

import importlib
from contextlib import contextmanager
from typing import Any, Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

_JOBS: dict[str, dict[str, Any]] = {}


def _seed_job(job_id: str, **overrides: Any) -> dict[str, Any]:
    row = {
        "id": job_id,
        "site_url": "https://example.com",
        "client_id": None,
        "status": "QUEUED",
        "progress": 0,
        "stage": None,
        "error": None,
        "result": None,
        "created_by": "user-1",
        "created_at": "2026-06-12T00:00:00+00:00",
        "updated_at": "2026-06-12T00:00:00+00:00",
    }
    row.update(overrides)
    _JOBS[job_id] = row
    return row


@contextmanager
def _fake_pg_conn() -> Iterator[object]:
    yield object()


@pytest.fixture
def audit_client(monkeypatch):
    _JOBS.clear()
    monkeypatch.setenv("AGENT_API_KEY", "test-secret")
    monkeypatch.delenv("REDIS_URL", raising=False)

    def fake_create_job(conn, *, job_id, site_url, client_id, created_by):
        return _seed_job(
            job_id,
            site_url=site_url,
            client_id=client_id,
            created_by=created_by,
        )

    def fake_get_job(conn, job_id):
        return _JOBS.get(job_id)

    monkeypatch.setattr("db.pg_connection.postgres_enabled", lambda: True)
    monkeypatch.setattr("db.pg_connection.pg_conn", _fake_pg_conn)
    monkeypatch.setattr("db.audit_job_store.create_job", fake_create_job)
    monkeypatch.setattr("db.audit_job_store.get_job", fake_get_job)

    import agent_api.app as app_module

    importlib.reload(app_module)
    monkeypatch.setattr(app_module, "API_KEY", "test-secret")
    monkeypatch.setattr(app_module, "postgres_enabled", lambda: True)
    monkeypatch.setattr(app_module, "pg_conn", _fake_pg_conn)
    async def _noop_run_audit(*args, **kwargs):
        return None

    monkeypatch.setattr(app_module, "run_audit", _noop_run_audit)
    return TestClient(app_module.app)


def test_audit_run_returns_202(audit_client):
    response = audit_client.post(
        "/agents/audit/run",
        json={
            "site_url": "https://example.com",
            "client_id": None,
            "created_by": "user-1",
        },
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert body["job_id"]


def test_audit_status_not_found(audit_client):
    response = audit_client.get(
        "/agents/audit/status/missing",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 404


def test_audit_result_409_when_not_done(audit_client):
    job_id = "job-queued"
    _seed_job(job_id, status="RUNNING", progress=50, stage="scoring_clarity")
    response = audit_client.get(
        f"/agents/audit/result/{job_id}",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 409


def test_audit_result_when_done(audit_client):
    job_id = "job-done"
    _seed_job(
        job_id,
        status="DONE",
        progress=100,
        result={
            "audit": {"discoverability": 72, "clarity": 80, "authority": 61, "trust": 88},
            "gaps": [{"layer": "authority", "issue": "Low score", "severity": "high", "fix_hint": "Earn links"}],
        },
    )
    response = audit_client.get(
        f"/agents/audit/result/{job_id}",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["audit"]["discoverability"] == 72
    assert len(body["gaps"]) == 1
