# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; **never** use on production publish)

### Replit publish / database migrations

**STOP — do not approve destructive migrations.** If the publish preview shows `DROP TABLE`, `DROP COLUMN`, or `CASCADE` on `silver_coins`, `player_inbox_messages`, `admin_grants`, `gambling_challenges`, `show_staff_chat_tag`, `progress_version`, or `author_staff_tag`, **click Cancel** (not "Approve and publish"). Approving would delete silver coins, inbox mail, and admin grant history from production.

#### Why this happens

Replit compares the **Development** database schema to **Production** at publish time. Production already has those columns/tables (applied safely at API startup via `ensure*Schema()`). If Development is missing them, Replit generates **DROP** migrations to "sync" production down — which destroys live data.

#### Before every republish (Replit Shell)

Run these commands **in order** in the Replit **Shell** (`~/workspace`):

```bash
cd ~/workspace
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run sync-schema
```

Alternative (same baseline SQL, no TypeScript):

```bash
node scripts/sync-dev-database-schema.mjs
```

Both commands target `$DATABASE_URL` (Development). You should see `Verified: players.silver_coins exists on development DB.` or `Development database schema synced`.

Confirm in **Database → Development** that the `players` table has a `silver_coins` column.

#### Then republish

1. Open **Publish** / **Republish**.
2. The migration preview should be **empty** or **add-only** (no `DROP`).
3. If you still see `DROP`, **cancel**, re-run the sync commands above, and try again.
4. Only publish when the preview has no destructive statements.

#### `ignoreDatabaseMigrations`

`.replit` sets `ignoreDatabaseMigrations = true` under `[deployment]`. This tells Replit **not** to auto-run its database provisioner on deploy; schema changes are applied at API startup via `ensure*Schema()` (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).

**Important:** This flag does **not** always hide the publish-time schema comparison dialog. You may still see the migration preview — treat it as a safety check. **Never approve a preview that contains DROP statements**, even with this flag set.
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Astrum Drift

A web-based, text-focused space mining MMORPG built on this monorepo.

### Artifacts

- `artifacts/astrum-drift` — React + Vite frontend at `/`. Pages: `/` (auth), `/play` (game).
- `artifacts/api-server` — Express 5 API at `/api`.
- `artifacts/coming-soon` — Standalone React + Vite "coming soon" landing page at `/coming-soon/`. Frontend-only, no backend calls; reuses the nebula bg, twinkle stars, fonts, and glassmorphism tokens from `astrum-drift`. Single page with the ASTRUM DRIFT wordmark, violet italic tagline, "Launching Soon" headline, and a Contact Us button that reveals `contact@astrumdrift.com` as a `mailto:` link.

### Backend modules

- `artifacts/api-server/src/lib/session.ts` — `express-session` configured with `connect-pg-simple` PG store, httpOnly+sameSite=lax cookies, secure in prod. Reads `SESSION_SECRET`.
- `artifacts/api-server/src/lib/constants.ts` — game constants: `CYCLE_DURATION_SEC=30`, `CREDITS_PER_CYCLE=25`, `XP_PER_CYCLE=10`, `xpForLevel(level) = level*100`.
- `artifacts/api-server/src/lib/player.ts` — `serializePlayer()` shapes the DB row to the OpenAPI `Player` schema (including derived `cycleDurationSec`).
- Mining is a single-cycle Start/Stop toggle: `/mining/start` is idempotent, `/mining/collect` validates >=30s elapsed and grants one cycle reward then clears `mining_started_at`. The browser auto-loops collect→start while the user keeps the page open. Stop is purely client-side (just halts the local loop); any in-progress server cycle is left intact and can be claimed later by toggling Start again or reloading.
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` and `getClientIp`.
- `artifacts/api-server/src/routes/auth.ts` — register/login/logout/me. **Session is saved BEFORE the IP is claimed**, and the player + session are rolled back if the IP claim fails. Anti-cheat is enforced atomically via `INSERT … ON CONFLICT (player_id) DO UPDATE` on `user_sessions`, with a unique index on `ip` providing race-free same-IP rejection (23505 → 403).
- `artifacts/api-server/src/routes/mining.ts` — start/collect. Both wrap their read-modify-write in a `db.transaction` with `SELECT ... FOR UPDATE` on the player row to prevent lost updates under concurrent requests.

### DB schema (`lib/db/src/schema/`)

- `players` — id, username (unique), hashed_password, credits, experience, current_location (default `Earth Orbit`), mining_level, mining_started_at (null = not mining), created_at.
- `user_sessions` — id, player_id (unique, FK → players, ON DELETE CASCADE), ip, created_at, with a unique index on `ip`. This table provides the atomic IP-based anti-cheat lock.
- `session` — `connect-pg-simple`'s sid/sess/expire table (cookie storage, separate from `user_sessions`).

### Frontend

- `src/pages/auth.tsx` — tabbed login/register. Surfaces 403 IP-conflict messages inline.
- `src/pages/play.tsx` — game shell. Mining countdown computed client-side from `miningStartedAt + cycleDurationSec`; auto-shows a "Collect Yield" button when one or more cycles are ready. **On logout, the GetMe query cache is cleared (`setQueryData(key, null)` + `removeQueries`) BEFORE navigating to `/`** to avoid an infinite redirect loop between auth and play pages.
- `src/hooks/use-mining-timer.ts` — polls every second, exposes `timeLeft`, `completedCycles`, `isReadyToCollect`, `handleCollect`.

### Required env

- `SESSION_SECRET` — set as a Replit secret.
- `DATABASE_URL`, `PORT`, `BASE_PATH` — auto-provided by the workspace.

### Deploy from Desktop (Cursor → Replit)

Replit Agent git remotes (`subrepl-*` / `git@ssh.riker.replit.dev`) do **not** accept pushes from your PC. Use **GitHub + optional Repl SSH** instead:

1. **GitHub:** Create a repo and connect the Repl (Git pane → Connect to GitHub).
2. **Desktop:** `git remote add origin https://github.com/YOU/astrum-drift.git` then push once.
3. **SSH key:** Public key at [replit.com/account#ssh-keys](https://replit.com/account#ssh-keys) (Desktop key: `~/.ssh/replit_astrum.pub`).
4. **Config:** Copy `.replit-deploy.json.example` → `.replit-deploy.json`. Set `replSshHost` from Repl → + → SSH → Connect manually (the `user@….replit.dev` string).
5. **Deploy:** `pwsh scripts/deploy-to-replit.ps1` — pushes to GitHub, SSHes into the Repl, runs `git pull`, then republish in Replit if needed.
