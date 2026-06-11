# Register AI Search OS agent worker as a scheduled task (run as current user).
$ErrorActionPreference = "Stop"
$Repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Python = Join-Path $Repo "venv\Scripts\python.exe"
$Script = Join-Path $Repo "scripts\agent_worker.py"
$TaskName = "AISearchOS\Agent Worker"

if (-not (Test-Path $Python)) {
    Write-Error "Create venv first: python -m venv venv; pip install -r requirements.txt"
}

$Action = New-ScheduledTaskAction -Execute $Python -Argument $Script -WorkingDirectory $Repo
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force
Write-Host "Registered: $TaskName"
