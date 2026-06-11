"""Load .env and ensure SSL cert bundle for outbound HTTPS."""

from __future__ import annotations

import os
from pathlib import Path


def load_dotenv_if_present() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    root = Path(__file__).resolve().parents[1]
    for base in (root, Path.cwd()):
        env_file = base / ".env"
        local_file = base / ".env.local"
        if env_file.is_file():
            load_dotenv(env_file, override=False)
        if local_file.is_file():
            load_dotenv(local_file, override=True)
        if env_file.is_file() or local_file.is_file():
            break


def ensure_ssl_cert_bundle() -> None:
    try:
        import certifi
        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
        os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
    except ImportError:
        pass
