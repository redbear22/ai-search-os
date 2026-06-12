"""arq WorkerSettings — `arq agent_api.arq_settings.WorkerSettings`."""

from __future__ import annotations

import os

from arq.connections import RedisSettings

from agent_api.worker import on_startup, run_audit, run_fix

redis_url = os.environ.get("REDIS_URL", "").strip()
if not redis_url:
    raise RuntimeError("REDIS_URL is required for the arq worker process")


async def on_shutdown(ctx: dict) -> None:
    return None


class WorkerSettings:
    functions = [run_audit, run_fix]
    redis_settings = RedisSettings.from_dsn(redis_url)
    max_tries = 3
    job_timeout = 300
    keep_result = 3600
    on_startup = on_startup
    on_shutdown = on_shutdown
