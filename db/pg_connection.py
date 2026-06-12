"""PostgreSQL connection for Agent API (Supabase) via psycopg3."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg
from psycopg.rows import dict_row

# Railway Agent API: CITATION_DATABASE_URL = direct Supabase (port 5432).
_RUNTIME_KEYS = (
    "CITATION_DATABASE_URL",
    "AUDIT_DATABASE_URL",
    "DATABASE_URL",
    "POSTGRES_URL_NON_POOLING",
)

_DIRECT_KEYS = (
    "CITATION_DATABASE_URL_DIRECT",
    "AUDIT_DATABASE_URL_DIRECT",
    "DIRECT_URL",
    "POSTGRES_URL_NON_POOLING",
)


def _first_env(keys: tuple[str, ...]) -> str | None:
    for key in keys:
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return None


def get_database_url() -> str | None:
    return _first_env(_RUNTIME_KEYS)


def get_direct_database_url() -> str | None:
    return _first_env(_DIRECT_KEYS) or get_database_url()


def postgres_enabled() -> bool:
    return bool(get_direct_database_url())


def _sanitize_url(url: str) -> str:
    """Strip Prisma-only pgbouncer query params before psycopg connect."""
    parsed = urlparse(url)
    if not parsed.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parsed.query) if k.lower() != "pgbouncer"]
    query = urlencode(kept)
    return urlunparse(parsed._replace(query=query))


def _uses_pooler(url: str) -> bool:
    lower = url.lower()
    return ":6543/" in lower or "pgbouncer" in lower


@contextmanager
def pg_conn() -> Iterator[psycopg.Connection]:
    url = get_direct_database_url()
    if not url:
        raise RuntimeError(
            "Set CITATION_DATABASE_URL (direct Supabase, port 5432) for audit jobs"
        )
    clean = _sanitize_url(url)
    kwargs: dict = {"row_factory": dict_row}
    if _uses_pooler(clean):
        kwargs["prepare_threshold"] = None
    with psycopg.connect(clean, **kwargs) as conn:
        yield conn


def make_pg_factory():
    """arq worker startup: ctx['db'] = make_pg_factory()."""
    return pg_conn
