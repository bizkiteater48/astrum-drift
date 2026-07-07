#!/usr/bin/env bash
# Backup Astrum Drift PostgreSQL (run in Replit Shell where DATABASE_URL is set).
#
# Usage:
#   bash scripts/backup-database.sh
#   bash scripts/backup-database.sh ./my-backups
#
# Restore (example):
#   pg_restore -d "$DATABASE_URL" --clean --if-exists ./backups/astrum-drift-YYYYMMDD-HHMMSS.dump

set -euo pipefail

BACKUP_DIR="${1:-$HOME/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/astrum-drift-$TIMESTAMP.dump"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Run this in Replit Shell." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" -Fc -f "$OUTPUT_FILE"

echo "Backup saved: $OUTPUT_FILE"
echo "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Download from Replit Files UI or copy off-Repl before major publishes."
