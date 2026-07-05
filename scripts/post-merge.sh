#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Schema is applied at API startup via ensureChatSchema() and ensureModerationSchema().
# Skipping drizzle push here avoids postMerge timeouts during publish/deploy.
echo "Skipping drizzle push (API ensures schema on startup)"
