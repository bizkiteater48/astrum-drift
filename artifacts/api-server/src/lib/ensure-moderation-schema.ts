import { pool } from "@workspace/db";
import { logger } from "./logger";

function parseUsernameList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((username) => username.trim())
    .filter(Boolean);
}

async function bootstrapStaffRoles(): Promise<void> {
  const adminUsernames = parseUsernameList(process.env.ADMIN_BOOTSTRAP_USERNAMES);
  const modUsernames = parseUsernameList(process.env.MOD_BOOTSTRAP_USERNAMES);

  for (const username of adminUsernames) {
    const result = await pool.query<{ id: number; username: string }>(
      `
        UPDATE players
        SET role = 'admin'
        WHERE LOWER(username) = LOWER($1)
          AND role <> 'admin'
        RETURNING id, username
      `,
      [username],
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(
        { playerId: result.rows[0]!.id, username: result.rows[0]!.username },
        "Bootstrapped admin role",
      );
    }
  }

  for (const username of modUsernames) {
    const result = await pool.query<{ id: number; username: string }>(
      `
        UPDATE players
        SET role = 'mod'
        WHERE LOWER(username) = LOWER($1)
          AND role = 'player'
        RETURNING id, username
      `,
      [username],
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(
        { playerId: result.rows[0]!.id, username: result.rows[0]!.username },
        "Bootstrapped mod role",
      );
    }
  }
}

export async function ensureModerationSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player';
  `);

  await pool.query(`
    ALTER TABLE players
      ADD COLUMN IF NOT EXISTS muted_until timestamptz;
  `);

  await pool.query(`
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
  `);

  await pool.query(`
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS deleted_by integer REFERENCES players(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_reports (
      id serial PRIMARY KEY,
      reporter_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      reported_player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      channel text,
      message_id integer,
      reason text NOT NULL,
      details text,
      status text NOT NULL DEFAULT 'pending',
      resolved_by integer REFERENCES players(id) ON DELETE SET NULL,
      resolution_note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS player_reports_status_created_idx
      ON player_reports (status, created_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_records (
      id serial PRIMARY KEY,
      player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      moderator_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      action text NOT NULL,
      reason text NOT NULL,
      duration_minutes integer,
      message_id integer,
      report_id integer REFERENCES player_reports(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS moderation_records_player_created_idx
      ON moderation_records (player_id, created_at);
  `);

  logger.info("Moderation schema ready");

  await bootstrapStaffRoles();
}
