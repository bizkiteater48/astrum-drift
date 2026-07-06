import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureAdminSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS progress_version integer NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_grants (
      id serial PRIMARY KEY,
      admin_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      target_player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      note text NOT NULL,
      credits_delta integer NOT NULL DEFAULT 0,
      silver_coins_delta integer NOT NULL DEFAULT 0,
      items_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS admin_grants_created_at_idx
      ON admin_grants (created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS admin_grants_target_player_idx
      ON admin_grants (target_player_id, created_at DESC);
  `);

  logger.info("Admin schema ensured");
}
