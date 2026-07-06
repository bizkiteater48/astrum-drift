import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, pool, playersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/staff";
import { serializePlayer } from "../lib/player";
import { buildAdminGrantInboxBody } from "../lib/player-inbox";

const router: IRouter = Router();

type TutorialProgressBlob = Record<string, unknown> & {
  tutorialInventory?: Record<string, number>;
  progressVersion?: number;
};

type GrantRow = {
  id: number;
  admin_id: number;
  admin_username: string;
  target_player_id: number;
  target_username: string;
  note: string;
  credits_delta: number;
  silver_coins_delta: number;
  items_json: Record<string, number>;
  created_at: Date;
};

const MAX_ITEM_GRANT_QUANTITY = 10_000;
const MAX_CREDITS_GRANT = 1_000_000;
const MAX_SILVER_COINS_GRANT = 100_000;
const MAX_NOTE_LENGTH = 500;

function parseDelta(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value)) return NaN;
  return value;
}

function parseItems(raw: unknown): Record<string, number> | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const items: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    const quantity = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(quantity) || quantity <= 0) return null;
    if (quantity > MAX_ITEM_GRANT_QUANTITY) return null;
    items[trimmedKey] = quantity;
  }

  return items;
}

function getInventoryFromProgress(
  progress: TutorialProgressBlob | null,
): Record<string, number> {
  const inventory = progress?.tutorialInventory;
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return {};
  }

  return { ...inventory };
}

function buildSnapshot(player: typeof playersTable.$inferSelect) {
  const progress = (player.tutorialProgress as TutorialProgressBlob | null) ?? null;
  const inventory = getInventoryFromProgress(progress);
  const inventoryCredits = inventory.Credits ?? 0;
  const creditsDesync = inventoryCredits !== player.credits;

  return {
    player: serializePlayer(player),
    inventory,
    progressVersion: player.progressVersion ?? 0,
    creditsDesync,
    inventoryCredits,
  };
}

router.get("/admin/grants", requireAdmin, async (req, res): Promise<void> => {
  const limitRaw = Number(req.query.limit);
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 100
      ? limitRaw
      : 25;

  const result = await pool.query<GrantRow>(
    `
      SELECT
        g.id,
        g.admin_id,
        admin.username AS admin_username,
        g.target_player_id,
        target.username AS target_username,
        g.note,
        g.credits_delta,
        g.silver_coins_delta,
        g.items_json,
        g.created_at
      FROM admin_grants g
      INNER JOIN players admin ON admin.id = g.admin_id
      INNER JOIN players target ON target.id = g.target_player_id
      ORDER BY g.created_at DESC
      LIMIT $1
    `,
    [limit],
  );

  res.status(200).json({
    grants: result.rows.map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      adminUsername: row.admin_username,
      targetPlayerId: row.target_player_id,
      targetUsername: row.target_username,
      note: row.note,
      creditsDelta: row.credits_delta,
      silverCoinsDelta: row.silver_coins_delta,
      items: row.items_json ?? {},
      createdAt: row.created_at.toISOString(),
    })),
  });
});

router.get(
  "/admin/players/:username/snapshot",
  requireAdmin,
  async (req, res): Promise<void> => {
    const username = req.params.username?.trim();
    if (!username) {
      res.status(400).json({ error: "Username is required." });
      return;
    }

    const [player] = await db
      .select()
      .from(playersTable)
      .where(ilike(playersTable.username, username));

    if (!player) {
      res.status(404).json({ error: "Player not found." });
      return;
    }

    res.status(200).json(buildSnapshot(player));
  },
);

router.post(
  "/admin/players/:username/grant",
  requireAdmin,
  async (req, res): Promise<void> => {
    const username = req.params.username?.trim();
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const creditsDelta = parseDelta(req.body?.creditsDelta);
    const silverCoinsDelta = parseDelta(req.body?.silverCoinsDelta);
    const items = parseItems(req.body?.items);

    if (!username) {
      res.status(400).json({ error: "Username is required." });
      return;
    }

    if (!note || note.length > MAX_NOTE_LENGTH) {
      res.status(400).json({ error: "A grant note up to 500 characters is required." });
      return;
    }

    if (Number.isNaN(creditsDelta) || Number.isNaN(silverCoinsDelta) || items === null) {
      res.status(400).json({ error: "Invalid grant amounts." });
      return;
    }

    if (
      Math.abs(creditsDelta) > MAX_CREDITS_GRANT ||
      Math.abs(silverCoinsDelta) > MAX_SILVER_COINS_GRANT
    ) {
      res.status(400).json({ error: "Grant amount exceeds allowed limit." });
      return;
    }

    const hasItemGrants = Object.keys(items).length > 0;
    if (creditsDelta === 0 && silverCoinsDelta === 0 && !hasItemGrants) {
      res.status(400).json({ error: "Grant at least one credit, coin, or item." });
      return;
    }

    const adminId = req.session.playerId!;
    const client = await pool.connect();
    let targetPlayerId: number | null = null;

    try {
      await client.query("BEGIN");

      const targetResult = await client.query(
        `SELECT * FROM players WHERE LOWER(username) = LOWER($1) FOR UPDATE`,
        [username],
      );
      const target = targetResult.rows[0] as
        | {
            id: number;
            credits: number;
            silver_coins: number;
            progress_version: number;
            tutorial_progress: unknown;
          }
        | undefined;
      if (!target) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Player not found." });
        return;
      }

      targetPlayerId = target.id;

      const nextCredits = Math.max(0, target.credits + creditsDelta);
      const nextSilverCoins = Math.max(
        0,
        (target.silver_coins ?? 0) + silverCoinsDelta,
      );
      const nextProgressVersion = (target.progress_version ?? 0) + 1;

      const progress = {
        ...((target.tutorial_progress as TutorialProgressBlob | null) ?? {}),
      };
      const inventory = getInventoryFromProgress(progress);

      for (const [itemName, quantity] of Object.entries(items)) {
        inventory[itemName] = (inventory[itemName] ?? 0) + quantity;
      }

      if (creditsDelta !== 0) {
        inventory.Credits = nextCredits;
      }

      progress.tutorialInventory = inventory;
      progress.progressVersion = nextProgressVersion;

      const updatedResult = await client.query(
        `
          UPDATE players
          SET
            credits = $2,
            silver_coins = $3,
            progress_version = $4,
            tutorial_progress = $5::jsonb
          WHERE id = $1
          RETURNING *
        `,
        [
          target.id,
          nextCredits,
          nextSilverCoins,
          nextProgressVersion,
          JSON.stringify(progress),
        ],
      );

      await client.query(
        `
          INSERT INTO admin_grants (
            admin_id,
            target_player_id,
            note,
            credits_delta,
            silver_coins_delta,
            items_json
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          adminId,
          target.id,
          note,
          creditsDelta,
          silverCoinsDelta,
          JSON.stringify(items),
        ],
      );

      const grantBody = buildAdminGrantInboxBody(
        creditsDelta,
        silverCoinsDelta,
        items,
      );
      await client.query(
        `
          INSERT INTO player_inbox_messages (player_id, sender_label, subject, body)
          VALUES ($1, $2, $3, $4)
        `,
        [target.id, "Admin", "Player Support Grant", grantBody],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      req.log.error({ error, username }, "Failed to apply admin grant");
      res.status(503).json({ error: "Failed to apply grant." });
      return;
    } finally {
      client.release();
    }

    try {
      const [updated] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, targetPlayerId!));

      res.status(200).json({
        snapshot: buildSnapshot(updated!),
      });
    } catch (error) {
      req.log.error({ error, username }, "Failed to load grant snapshot");
      res.status(503).json({ error: "Grant applied but snapshot failed." });
    }
  },
);

export default router;
