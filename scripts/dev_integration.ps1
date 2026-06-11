# Start ai-search-os + my-ai-seo services for local Citation Engine integration.
# Opens separate windows for Agent API, Citation REST API, and Next.js web.
$ErrorActionPreference = "Stop"

$asosRoot = Split-Path -Parent $PSScriptRoot
$ceRoot = if ($env:CITATION_ENGINE_ROOT) { $env:CITATION_ENGINE_ROOT } else { "d:\Dev\my-ai-seo" }

Write-Host "AI Search OS root: $asosRoot"
Write-Host "Citation Engine root: $ceRoot"
Write-Host ""
Write-Host "Ports:"
Write-Host "  3000  Next.js web (ai-search-os)"
Write-Host "  8787  Agent API (ai-search-os)"
Write-Host "  8510  Citation REST API (my-ai-seo citation_api)"
Write-Host "  8501  Citation Streamlit UI (my-ai-seo app_v8.py) — optional"
Write-Host ""
Write-Host "Ensure web/.env.local has:"
Write-Host "  CITATION_ENGINE_ENABLED=true"
Write-Host "  CITATION_ENGINE_URL=http://localhost:8510"
Write-Host "  AGENT_API_ENABLED=true"
Write-Host "  AGENT_API_URL=http://localhost:8787"
Write-Host "  AGENT_API_KEY=<same as ai-search-os .env.local>"
Write-Host ""

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDir,
        [string]$Command
    )
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$WorkingDir'; Write-Host '=== $Title ===' -ForegroundColor Cyan; $Command"
    )
}

$venvActivate = ""
if (Test-Path "$asosRoot\venv\Scripts\Activate.ps1") {
    $venvActivate = ". '$asosRoot\venv\Scripts\Activate.ps1'; "
}

$ceVenvActivate = ""
if (Test-Path "$ceRoot\venv\Scripts\Activate.ps1") {
    $ceVenvActivate = ". '$ceRoot\venv\Scripts\Activate.ps1'; "
}

Start-ServiceWindow "Agent API :8787" $asosRoot "${venvActivate}python -m agent_api"
Start-ServiceWindow "Citation REST :8510" $ceRoot "${ceVenvActivate}python -m citation_api"
Start-ServiceWindow "Next.js :3000" "$asosRoot\web" "npm run dev"

Write-Host "Started Agent API, Citation REST API, and Next.js in new windows."
