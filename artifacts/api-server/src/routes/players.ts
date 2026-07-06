import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, eq, ilike, ne } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializePlayer } from "../lib/player";
import { canShowStaffChatTag } from "../lib/moderation";

const router: IRouter = Router();

const playerSearchLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many player searches. Slow down." },
});

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseSearchLimit(raw: unknown, maxLimit: number): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return Math.min(10, maxLimit);
  }
  return Math.min(maxLimit, value);
}

const DIRECTORY_MAX_LIMIT = 100;
const SEARCH_MAX_LIMIT = 20;

router.get("/players/search", requireAuth, playerSearchLimiter, async (req, res): Promise<void> => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const excludeSelf = req.query.excludeSelf !== "false";
  const playerId = req.session.playerId!;

  if (query.length < 2) {
    const limit = parseSearchLimit(req.query.limit, DIRECTORY_MAX_LIMIT);
    const directoryQuery = db
      .select({
        id: playersTable.id,
        username: playersTable.username,
      })
      .from(playersTable)
      .orderBy(asc(playersTable.username))
      .limit(limit);

    const players = excludeSelf
      ? await directoryQuery.where(ne(playersTable.id, playerId))
      : await directoryQuery;

    res.status(200).json({ players, mode: "directory" });
    return;
  }

  const limit = parseSearchLimit(req.query.limit, SEARCH_MAX_LIMIT);
  const pattern = `%${escapeIlikePattern(query)}%`;
  const filters = [ilike(playersTable.username, pattern)];
  if (excludeSelf) {
    filters.push(ne(playersTable.id, playerId));
  }

  const players = await db
    .select({
      id: playersTable.id,
      username: playersTable.username,
    })
    .from(playersTable)
    .where(and(...filters))
    .orderBy(asc(playersTable.username))
    .limit(limit);

  res.status(200).json({ players, mode: "search" });
});

router.patch("/players/preferences", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, playerId));

  if (!player) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!canShowStaffChatTag(player.role)) {
    res.status(403).json({ error: "Staff chat tag preference is not available." });
    return;
  }

  const showStaffChatTag = req.body?.showStaffChatTag;
  if (typeof showStaffChatTag !== "boolean") {
    res.status(400).json({ error: "showStaffChatTag must be a boolean." });
    return;
  }

  const [updated] = await db
    .update(playersTable)
    .set({ showStaffChatTag })
    .where(eq(playersTable.id, playerId))
    .returning();

  res.status(200).json(serializePlayer(updated!));
});

export default router;
