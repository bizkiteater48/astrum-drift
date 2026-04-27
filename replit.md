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
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Astrum Drift

A web-based, text-focused space mining MMORPG built on this monorepo.

### Artifacts

- `artifacts/astrum-drift` — React + Vite frontend at `/`. Pages: `/` (auth), `/play` (game).
- `artifacts/api-server` — Express 5 API at `/api`.

### Backend modules

- `artifacts/api-server/src/lib/session.ts` — `express-session` configured with `connect-pg-simple` PG store, httpOnly+sameSite=lax cookies, secure in prod. Reads `SESSION_SECRET`.
- `artifacts/api-server/src/lib/constants.ts` — game constants: `CYCLE_DURATION_SEC=30`, `MAX_MINING_QUEUE=20`, `CREDITS_PER_CYCLE=25`, `XP_PER_CYCLE=10`, `xpForLevel(level) = level*100`.
- `artifacts/api-server/src/lib/player.ts` — `serializePlayer()` shapes the DB row to the OpenAPI `Player` schema (including derived `cycleDurationSec` / `maxQueue`).
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` and `getClientIp`.
- `artifacts/api-server/src/routes/auth.ts` — register/login/logout/me. **Session is saved BEFORE `activeIp` is claimed**, and `activeIp` is rolled back if the IP claim fails. Anti-cheat is enforced atomically by a Postgres unique partial index `players_active_ip_unique` (no application-level race).
- `artifacts/api-server/src/routes/mining.ts` — start/collect. Both wrap their read-modify-write in a `db.transaction` with `SELECT ... FOR UPDATE` on the player row to prevent lost updates under concurrent requests.

### DB schema (`lib/db/src/schema/`)

- `players` — id, username (unique), hashed_password, credits, experience, current_location (default `Earth Orbit`), mining_level, mining_queued, mining_started_at, active_ip, created_at. Includes a unique partial index on `active_ip` where `active_ip IS NOT NULL` — this is the atomic anti-cheat.
- `session` — `connect-pg-simple`'s sid/sess/expire table.

### Frontend

- `src/pages/auth.tsx` — tabbed login/register. Surfaces 403 IP-conflict messages inline.
- `src/pages/play.tsx` — game shell. Mining countdown computed client-side from `miningStartedAt + cycleDurationSec`; auto-shows a "Collect Yield" button when one or more cycles are ready. **On logout, the GetMe query cache is cleared (`setQueryData(key, null)` + `removeQueries`) BEFORE navigating to `/`** to avoid an infinite redirect loop between auth and play pages.
- `src/hooks/use-mining-timer.ts` — polls every second, exposes `timeLeft`, `completedCycles`, `isReadyToCollect`, `handleCollect`.

### Required env

- `SESSION_SECRET` — set as a Replit secret.
- `DATABASE_URL`, `PORT`, `BASE_PATH` — auto-provided by the workspace.
