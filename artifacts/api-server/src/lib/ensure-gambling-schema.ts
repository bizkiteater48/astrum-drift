import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureGamblingSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS silver_coins integer NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gambling_challenges (
      id serial PRIMARY KEY,
      challenger_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      opponent_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game text NOT NULL DEFAULT 'warp_flip',
      stake integer NOT NULL,
      challenger_choice text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      winner_id integer REFERENCES players(id) ON DELETE SET NULL,
      flip_result text,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS gambling_challenges_opponent_pending_idx
      ON gambling_challenges (opponent_id, status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS gambling_challenges_challenger_pending_idx
      ON gambling_challenges (challenger_id, status, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poker_games (
      id serial PRIMARY KEY,
      inviter_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      opponent_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      buy_in integer NOT NULL,
      status text NOT NULL DEFAULT 'invited',
      state jsonb,
      winner_id integer REFERENCES players(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS poker_games_player_status_idx
      ON poker_games (inviter_id, status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS poker_games_opponent_status_idx
      ON poker_games (opponent_id, status, created_at DESC);
  `);

  logger.info("Gambling schema ensured");
}
