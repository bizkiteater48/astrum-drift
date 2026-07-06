-- Safe idempotent baseline: matches ensure-*-schema.ts startup DDL.
-- Replit publish must NEVER apply migrations that DROP these objects.

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "silver_coins" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "progress_version" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "show_staff_chat_tag" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'player';
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "muted_until" timestamptz;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "deleted_by" integer REFERENCES "players"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "author_staff_tag" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gambling_challenges" (
  "id" serial PRIMARY KEY,
  "challenger_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "opponent_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "game" text NOT NULL DEFAULT 'warp_flip',
  "stake" integer NOT NULL,
  "challenger_choice" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "winner_id" integer REFERENCES "players"("id") ON DELETE SET NULL,
  "flip_result" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gambling_challenges_opponent_pending_idx"
  ON "gambling_challenges" ("opponent_id", "status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gambling_challenges_challenger_pending_idx"
  ON "gambling_challenges" ("challenger_id", "status", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_grants" (
  "id" serial PRIMARY KEY,
  "admin_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "target_player_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "note" text NOT NULL,
  "credits_delta" integer NOT NULL DEFAULT 0,
  "silver_coins_delta" integer NOT NULL DEFAULT 0,
  "items_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_grants_created_at_idx"
  ON "admin_grants" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_grants_target_player_idx"
  ON "admin_grants" ("target_player_id", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_inbox_messages" (
  "id" serial PRIMARY KEY,
  "player_id" integer NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "sender_label" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_inbox_messages_player_created_idx"
  ON "player_inbox_messages" ("player_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_inbox_messages_player_unread_idx"
  ON "player_inbox_messages" ("player_id")
  WHERE "read_at" IS NULL;
