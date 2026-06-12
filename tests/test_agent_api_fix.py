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
        "gap_id": None,
        "status": "QUEUED",
        "progress": 0,
        "stage": None,
        "error": None,
        "input": {
            "gaps": [
                {
                    "layer": "authority",
                    "issue": "Low authority score",
                    "severity": "high",
                    "fix_hint": "Earn links",
                }
            ]
        },
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
def fix_client(monkeypatch):
    _JOBS.clear()
    monkeypatch.setenv("AGENT_API_KEY", "test-secret")
    monkeypatch.delenv("REDIS_URL", raising=False)

    def fake_create_job(conn, *, job_id, site_url, client_id, gap_id, created_by, gaps_input):
        return _seed_job(
            job_id,
            site_url=site_url,
            client_id=client_id,
            gap_id=gap_id,
            created_by=created_by,
            input={"gaps": gaps_input},
        )

    def fake_get_job(conn, job_id):
        return _JOBS.get(job_id)

    monkeypatch.setattr("db.pg_connection.postgres_enabled", lambda: True)
    monkeypatch.setattr("db.pg_connection.pg_conn", _fake_pg_conn)
    monkeypatch.setattr("db.fix_job_store.create_job", fake_create_job)
    monkeypatch.setattr("db.fix_job_store.get_job", fake_get_job)

    import agent_api.app as app_module

    importlib.reload(app_module)
    monkeypatch.setattr(app_module, "API_KEY", "test-secret")
    monkeypatch.setattr(app_module, "postgres_enabled", lambda: True)
    monkeypatch.setattr(app_module, "pg_conn", _fake_pg_conn)

    async def _noop_run_fix(*args, **kwargs):
        return None

    monkeypatch.setattr(app_module, "run_fix", _noop_run_fix)
    return TestClient(app_module.app)


def test_fix_run_returns_202(fix_client):
    response = fix_client.post(
        "/agents/fix/run",
        json={
            "site_url": "https://example.com",
            "client_id": None,
            "created_by": "user-1",
            "gaps": [
                {
                    "layer": "authority",
                    "issue": "Low authority score",
                    "severity": "high",
                    "fix_hint": "Earn links",
                }
            ],
        },
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert body["job_id"]


def test_fix_status_not_found(fix_client):
    response = fix_client.get(
        "/agents/fix/status/missing",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 404


def test_fix_result_409_when_running(fix_client):
    job_id = "job-running"
    _seed_job(job_id, status="RUNNING", progress=40, stage="generating_fix_1_of_1")
    response = fix_client.get(
        f"/agents/fix/result/{job_id}",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 409


def test_fix_result_when_needs_approval(fix_client):
    job_id = "job-ready"
    _seed_job(
        job_id,
        status="NEEDS_APPROVAL",
        progress=100,
        result={
            "fixes": [
                {
                    "layer": "authority",
                    "severity": "high",
                    "issue": "Low authority score",
                    "action": "Earn citations",
                    "contentDraft": "",
                    "successMetrics": ["KPI up"],
                    "resources": ["PR"],
                    "estimatedEffort": "8-16 hours",
                }
            ]
        },
    )
    response = fix_client.get(
        f"/agents/fix/result/{job_id}",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "needs_approval"
    assert len(body["fixes"]) == 1
