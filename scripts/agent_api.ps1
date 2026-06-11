# Start Agent API on port 8787 (Next.js web UI uses AGENT_API_URL).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (Test-Path "$root\venv\Scripts\Activate.ps1") {
    . "$root\venv\Scripts\Activate.ps1"
}

python -m agent_api
