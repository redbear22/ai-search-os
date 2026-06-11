# Start AI Search OS on port 8502 (Citation Engine uses 8501).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (Test-Path "$root\venv\Scripts\Activate.ps1") {
    . "$root\venv\Scripts\Activate.ps1"
}

streamlit run app.py --server.port 8502
