/**
 * Apply idempotent schema DDL to the database in DATABASE_URL.
 * Run in the Replit Shell (development DB) before publishing so Replit
 * does not generate destructive prod migrations.
 *
 *   node scripts/sync-dev-database-schema.mjs
 *
 * pg is resolved from @workspace/db (not the repo root) so this works on Replit.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "lib/db/package.json"));
const { Pool } = require("pg");

const sqlPath = join(root, "lib/db/migrations/0000_workspace_baseline.sql");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Open Database → Development in Replit.");
  process.exit(1);
}

const raw = readFileSync(sqlPath, "utf8");
const statements = raw
  .split(/--> statement-breakpoint\n?/)
  .map((part) => part.trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log(`Applied ${statements.length} idempotent schema statements.`);

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
  console.log("Verified: players.silver_coins exists on development DB.");
} catch (error) {
  console.error("Schema sync failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
