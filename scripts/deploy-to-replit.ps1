# Push Astrum Drift from Desktop to Replit via GitHub (+ optional Repl SSH pull).
#
# One-time setup:
# 1. Create a GitHub repo and connect your Repl (Git pane -> Connect to GitHub).
# 2. On Desktop: git remote add origin https://github.com/YOU/astrum-drift.git
# 3. Copy .replit-deploy.json.example -> .replit-deploy.json and fill in replSshHost
#    (Replit -> + -> SSH -> Connect -> Connect manually; copy user@host).
# 4. Add your SSH public key at https://replit.com/account#ssh-keys
#
# Usage:
#   pwsh scripts/deploy-to-replit.ps1
#   pwsh scripts/deploy-to-replit.ps1 -Message "Fix Star Chart maps"

param(
  [string]$Message = "Deploy from Desktop",
  [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Git = "C:\Program Files\Git\bin\git.exe"
$SshKey = Join-Path $env:USERPROFILE ".ssh\replit_astrum"
$ConfigPath = Join-Path $RepoRoot ".replit-deploy.json"

function Invoke-Git {
  param([string[]]$Args)
  & $Git -C $RepoRoot @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Push-Location $RepoRoot
try {
  $status = Invoke-Git @("status", "--porcelain")
  if ($status -and -not $SkipCommit) {
    Write-Host "Committing local changes..."
    Invoke-Git @("add", "artifacts/", "lib/", "scripts/deploy-to-replit.ps1", "replit.md", ".replit-deploy.json.example")
    Invoke-Git @("commit", "-m", $Message)
  } elseif ($status -and $SkipCommit) {
    Write-Host "Uncommitted changes present. Commit first or omit -SkipCommit." -ForegroundColor Yellow
    exit 1
  }

  $remotes = Invoke-Git @("remote")
  $remoteName = "origin"
  $branch = "main"

  if (Test-Path $ConfigPath) {
    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    if ($config.githubRemote) { $remoteName = $config.githubRemote }
    if ($config.githubBranch) { $branch = $config.githubBranch }
  }

  if ($remotes -notcontains $remoteName) {
    Write-Host ""
    Write-Host "Missing git remote '$remoteName'. Add GitHub first:" -ForegroundColor Red
    Write-Host "  git remote add origin https://github.com/YOU/astrum-drift.git"
    Write-Host "  git push -u origin main"
    exit 1
  }

  Write-Host "Pushing to $remoteName/$branch..."
  Invoke-Git @("push", $remoteName, $branch)

  if (-not (Test-Path $ConfigPath)) {
    Write-Host ""
    Write-Host "Pushed to GitHub. In Replit Shell run: git pull origin main" -ForegroundColor Green
    Write-Host "For automatic Repl pull, copy .replit-deploy.json.example to .replit-deploy.json" -ForegroundColor Yellow
    exit 0
  }

  $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  if (-not $config.replSshHost -or $config.replSshHost -like "YOUR-*") {
    Write-Host ""
    Write-Host "Pushed to GitHub. Set replSshHost in .replit-deploy.json for automatic Repl pull." -ForegroundColor Yellow
    exit 0
  }

  if (-not (Test-Path $SshKey)) {
    throw "SSH key not found at $SshKey"
  }

  $port = if ($config.replSshPort) { $config.replSshPort } else { 22 }
  $workspace = if ($config.replWorkspace) { $config.replWorkspace } else { "/home/runner/workspace" }
  $remoteCmd = "cd $workspace && git pull $remoteName $branch && git log -1 --oneline"

  Write-Host "Pulling on Replit via SSH ($($config.replSshHost))..."
  & ssh -i $SshKey -p $port -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new `
    $config.replSshHost $remoteCmd

  if ($LASTEXITCODE -ne 0) {
    throw "Repl SSH pull failed. Confirm replSshHost and https://replit.com/account#ssh-keys"
  }

  Write-Host ""
  Write-Host "Deploy sync complete. Republish in Replit (Deploy -> Publish) if needed." -ForegroundColor Green
}
finally {
  Pop-Location
}
