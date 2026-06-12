"""Run Phase 1 mid-flight kill test against production Agent API."""

from __future__ import annotations

import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "https://aisearchrank-agent-api-production.up.railway.app"
USER_ID = "b672f607-fee9-45c4-bd3b-9419af079fb9"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_api_key() -> str:
    path = os.path.join(REPO_ROOT, ".tmp-railway-vars.json")
    with open(path, encoding="utf-8-sig") as handle:
        data = json.load(handle)
    key = (data.get("AGENT_API_KEY") or "").strip()
    if not key:
        raise SystemExit("AGENT_API_KEY missing in .tmp-railway-vars.json")
    return key


def _ssl_context() -> ssl.SSLContext:
    if os.environ.get("NODE_TLS_REJECT_UNAUTHORIZED", "").strip() == "0":
        return ssl._create_unverified_context()
    return ssl.create_default_context()


def req(api_key: str, method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30, context=_ssl_context()) as resp:
            payload = resp.read().decode()
            return resp.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode()
        try:
            detail = json.loads(payload)
        except json.JSONDecodeError:
            detail = {"raw": payload}
        return exc.code, detail


def main() -> int:
    api_key = load_api_key()

    code, created = req(api_key, "POST", "/agents/audit/run", {
        "site_url": "https://example.com",
        "created_by": USER_ID,
    })
    job_id = created.get("job_id")
    print(f"ENQUEUE {code} job_id={job_id}")
    if not job_id:
        return 1

    status = "unknown"
    stage = ""
    for i in range(30):
        _, st = req(api_key, "GET", f"/agents/audit/status/{job_id}")
        status = st.get("status", "")
        stage = st.get("stage", "")
        print(f"  poll {i}: {status} stage={stage} progress={st.get('progress')}")
        if status == "running":
            break
        if status in ("done", "failed"):
            break
        time.sleep(1)

    if status != "running":
        print("ABORT: never reached running")
        return 1

    print("sleep 10s then hard-restart worker...")
    time.sleep(10)
    env = os.environ.copy()
    env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
    subprocess.run(
        "railway redeploy --yes --service aisearchrank-agent-worker",
        cwd=REPO_ROOT,
        env=env,
        check=False,
        shell=True,
    )

    print("observing job for 90s...")
    for i in range(18):
        time.sleep(5)
        _, st = req(api_key, "GET", f"/agents/audit/status/{job_id}")
        status = st.get("status", "")
        stage = st.get("stage", "")
        print(f"  post-kill {i * 5}s: {status} stage={stage} progress={st.get('progress')}")
        if status in ("done", "failed"):
            break

    print(f"FINAL status={status} stage={stage}")
    code, res = req(api_key, "GET", f"/agents/audit/result/{job_id}")
    print(f"RESULT http={code} has_audit={'audit' in json.dumps(res)}")
    return 0 if status in ("done", "queued") else 1


if __name__ == "__main__":
    raise SystemExit(main())
