/**
 * Apply the same ensure*Schema() DDL as API startup, without listening on a port.
 * Use on Replit before publish when the development DB is behind production.
 *
 *   pnpm --filter @workspace/api-server run sync-schema
 */
import { ensureChatSchema } from "./lib/ensure-chat-schema";
import { ensureGamblingSchema } from "./lib/ensure-gambling-schema";
import { ensureAdminSchema } from "./lib/ensure-admin-schema";
import { ensureMessagingSchema } from "./lib/ensure-messaging-schema";
import { ensureModerationSchema } from "./lib/ensure-moderation-schema";
import { pool } from "@workspace/db";

try {
  await ensureChatSchema();
  await ensureModerationSchema();
  await ensureMessagingSchema();
  await ensureGamblingSchema();
  await ensureAdminSchema();

  const check = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name = 'silver_coins'
  `);
  if (check.rowCount === 0) {
    console.error("Verification failed: players.silver_coins is still missing.");
    process.exit(1);
  }

  console.log("Development database schema synced (ensure*Schema).");
} catch (err) {
  console.error("Schema sync failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
