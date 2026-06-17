#Requires -Version 5.1
<#
.SYNOPSIS
  Autonomous watchdog launcher for small/local models (Windows).
  Runs the DETERMINISTIC orchestrator: the control loop lives in Node, not in the
  model, so a weak local model cannot spiral into re-reads or repeated dead fixes.

.USAGE
  .\run-watchdog.ps1            # autonomous: build milestones + self-heal until done
  .\run-watchdog.ps1 -Test      # one health check only (verify environment)
  .\run-watchdog.ps1 -Interactive  # open a normal interactive Claude session
#>
param(
  [switch]$Test,
  [switch]$Interactive
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step($msg) { Write-Host "[watchdog] $msg" -ForegroundColor Cyan }

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error 'Claude Code CLI not found. Install: https://code.claude.com'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js not found. Install: https://nodejs.org'
}
if (-not (Test-Path 'project_description.md')) {
  Write-Error 'project_description.md not found in project root.'
}

$config = (node scripts/parse-project-config.mjs | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0) { throw 'Failed to parse project_description.md' }
Write-Step "Project: $($config.name) v$($config.version)"

if ($Interactive) {
  Write-Step 'Starting interactive Claude Code session ...'
  & claude --dangerously-skip-permissions
  exit $LASTEXITCODE
}

if ($Test) {
  Write-Step "Health check (one cycle): $($config.health_command)"
  & cmd /c $config.health_command
  if ($LASTEXITCODE -eq 0) { Write-Step 'RESULT: PASS' } else { Write-Step 'RESULT: FAIL' }
  exit $LASTEXITCODE
}

Write-Step 'Starting DETERMINISTIC orchestrator (autonomous) ...'
Write-Step 'The loop runs in Node; the model is called only for small scoped tasks.'
& node scripts/orchestrator.mjs
$code = $LASTEXITCODE
if ($code -eq 0) {
  Write-Step 'DONE: project complete and verified green.'
} else {
  Write-Step 'STOPPED: blocked for human review (see failed_attempts.log).'
}
exit $code
