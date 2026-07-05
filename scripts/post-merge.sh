#!/bin/bash
set -e
pnpm install --frozen-lockfile
if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter @workspace/db run push
else
  echo "DATABASE_URL not set; skipping drizzle push (API ensures chat schema on startup)"
fi
