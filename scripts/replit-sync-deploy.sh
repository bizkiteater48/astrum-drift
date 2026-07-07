#!/usr/bin/env bash
# Pull latest main on Replit, install deps, and sync dev DB schema.
# Run in Replit Shell before Republish.
#
# Usage:
#   bash scripts/replit-sync-deploy.sh

set -euo pipefail

cd /home/runner/workspace

echo "==> Fetching origin/main"
git fetch origin

echo "==> Resetting workspace to origin/main"
git reset --hard origin/main

echo "==> Latest commit"
git log -1 --oneline

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> Syncing database schema"
  pnpm --filter @workspace/api-server run sync-schema
else
  echo "WARNING: DATABASE_URL not set; skipped schema sync."
fi

if [[ -f artifacts/astrum-drift/public/version.json ]]; then
  echo "==> App version"
  cat artifacts/astrum-drift/public/version.json
fi

echo ""
echo "Sync complete. Open Deploy -> Republish in Replit."
echo "If the migration preview shows DROP statements, cancel and fix schema first."
