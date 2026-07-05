import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureChatSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id serial PRIMARY KEY,
      channel text NOT NULL,
      player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      username text NOT NULL,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS chat_messages_channel_id_idx
      ON chat_messages (channel, id);
  `);

  logger.info("Chat schema ready");
}
