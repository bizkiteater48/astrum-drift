# Backup Astrum Drift PostgreSQL from Windows when DATABASE_URL is available.
#
# Usage:
#   $env:DATABASE_URL = "postgresql://..."
#   pwsh scripts/backup-database.ps1
#
# Requires PostgreSQL client tools (pg_dump) on PATH.

param(
  [string]$OutputDir = (Join-Path $env:USERPROFILE "astrum-drift-backups")
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set. Use Replit Shell (scripts/backup-database.sh) for production backups."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  Write-Error "pg_dump not found. Install PostgreSQL client tools or run backup-database.sh in Replit Shell."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $OutputDir "astrum-drift-$timestamp.dump"

& pg_dump $env:DATABASE_URL -Fc -f $outputFile

Write-Host "Backup saved: $outputFile"
Write-Host "Size: $((Get-Item $outputFile).Length / 1MB) MB"
