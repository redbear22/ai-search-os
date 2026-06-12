"""Run Agent API with: python -m agent_api"""

from __future__ import annotations

import os

import uvicorn

PORT = int(os.getenv("PORT", os.getenv("AGENT_API_PORT", "8787")))

if __name__ == "__main__":
    uvicorn.run("agent_api.app:app", host="0.0.0.0", port=PORT, reload=False)
