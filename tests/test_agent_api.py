from __future__ import annotations

import importlib
import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENT_API_KEY", "test-secret")
    queue_dir = tmp_path / "citation_engine"
    monkeypatch.setattr(
        "services.citation_content_service.CONTENT_QUEUE_DIR",
        queue_dir,
    )
    monkeypatch.setattr(
        "services.citation_content_service.CONTENT_QUEUE_FILE",
        queue_dir / "content_queue.jsonl",
    )

    import agent_api.app as app_module

    importlib.reload(app_module)
    monkeypatch.setattr(app_module, "API_KEY", "test-secret")
    return TestClient(app_module.app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_content(client, tmp_path, monkeypatch):
    payload = {
        "type": "article",
        "title": "Test Article",
        "body": "Body text",
        "targetUrl": "https://example.com/post",
        "sourceGapId": "gap-1",
        "metadata": {"keyword": "espresso"},
    }
    response = client.post(
        "/jobs/content/create",
        json=payload,
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "created"
    assert body["id"]

    queue_file = tmp_path / "citation_engine" / "content_queue.jsonl"
    lines = queue_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["id"] == body["id"]
    assert record["payload"] == payload


def test_create_content_invalid_key(client):
    response = client.post(
        "/jobs/content/create",
        json={"type": "pitch", "title": "T", "body": "B", "metadata": {}},
        headers={"X-API-Key": "wrong"},
    )
    assert response.status_code == 401


def test_create_content_invalid_payload(client):
    response = client.post(
        "/jobs/content/create",
        json={"title": "missing type"},
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 422


@pytest.fixture
def outreach_client(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENT_API_KEY", "test-secret")
    queue_dir = tmp_path / "citation_engine"
    monkeypatch.setattr(
        "services.citation_outreach_service.OUTREACH_QUEUE_DIR",
        queue_dir,
    )
    monkeypatch.setattr(
        "services.citation_outreach_service.OUTREACH_QUEUE_FILE",
        queue_dir / "outreach_queue.jsonl",
    )

    import agent_api.app as app_module

    importlib.reload(app_module)
    monkeypatch.setattr(app_module, "API_KEY", "test-secret")
    return TestClient(app_module.app)


def test_create_outreach(outreach_client, tmp_path):
    task = {
        "publication": "Serious Eats",
        "pitch": "We have updated data on espresso machines.",
        "contactEmail": "editor@example.com",
        "priority": "high",
        "dueDate": "2026-06-15",
    }
    response = outreach_client.post(
        "/jobs/outreach/create",
        json=task,
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "created"
    assert body["id"]

    queue_file = tmp_path / "citation_engine" / "outreach_queue.jsonl"
    lines = queue_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["id"] == body["id"]
    assert record["task"] == task


def test_create_outreach_invalid_key(outreach_client):
    response = outreach_client.post(
        "/jobs/outreach/create",
        json={
            "publication": "X",
            "pitch": "Y",
            "priority": "low",
            "dueDate": "2026-06-01",
        },
        headers={"X-API-Key": "wrong"},
    )
    assert response.status_code == 401


def test_create_outreach_invalid_payload(outreach_client):
    response = outreach_client.post(
        "/jobs/outreach/create",
        json={"publication": "missing pitch"},
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 422
