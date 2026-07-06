import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureMessagingSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS show_staff_chat_tag boolean NOT NULL DEFAULT false;
  `);

  await pool.query(`
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS author_staff_tag text;
  `);

  await pool.query(`
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS message_kind text NOT NULL DEFAULT 'user';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_inbox_messages (
      id serial PRIMARY KEY,
      player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      sender_label text NOT NULL,
      subject text NOT NULL,
      body text NOT NULL,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS player_inbox_messages_player_created_idx
      ON player_inbox_messages (player_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS player_inbox_messages_player_unread_idx
      ON player_inbox_messages (player_id)
      WHERE read_at IS NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_chat_ignores (
      id serial PRIMARY KEY,
      player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      ignored_player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS player_chat_ignores_pair_idx
      ON player_chat_ignores (player_id, ignored_player_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS player_chat_ignores_player_idx
      ON player_chat_ignores (player_id);
  `);

  logger.info("Messaging schema ready");
}
