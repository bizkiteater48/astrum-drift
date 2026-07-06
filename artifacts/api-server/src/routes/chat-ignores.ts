import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, playerChatIgnoresTable, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { canBeChatIgnored } from "../lib/moderation";

const router: IRouter = Router();

router.get("/players/chat-ignores", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;

  const rows = await db
    .select({
      playerId: playerChatIgnoresTable.ignoredPlayerId,
      username: playersTable.username,
    })
    .from(playerChatIgnoresTable)
    .innerJoin(
      playersTable,
      eq(playerChatIgnoresTable.ignoredPlayerId, playersTable.id),
    )
    .where(eq(playerChatIgnoresTable.playerId, playerId));

  res.status(200).json({
    ignores: rows.map((row) => ({
      playerId: row.playerId,
      username: row.username,
    })),
  });
});

router.post("/players/chat-ignores", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;
  const username =
    typeof req.body?.username === "string" ? req.body.username.trim() : "";

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const [target] = await db
    .select({ id: playersTable.id, username: playersTable.username, role: playersTable.role })
    .from(playersTable)
    .where(eq(playersTable.username, username));

  if (!target) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  if (target.id === playerId) {
    res.status(400).json({ error: "You cannot ignore yourself" });
    return;
  }

  if (!canBeChatIgnored(target.role)) {
    res.status(403).json({ error: "Admins and moderators cannot be ignored" });
    return;
  }

  await db
    .insert(playerChatIgnoresTable)
    .values({
      playerId,
      ignoredPlayerId: target.id,
    })
    .onConflictDoNothing({
      target: [
        playerChatIgnoresTable.playerId,
        playerChatIgnoresTable.ignoredPlayerId,
      ],
    });

  res.status(201).json({
    ignore: {
      playerId: target.id,
      username: target.username,
    },
  });
});

router.delete(
  "/players/chat-ignores/:ignoredPlayerId",
  requireAuth,
  async (req, res): Promise<void> => {
    const playerId = req.session.playerId!;
    const ignoredPlayerId = Number(req.params.ignoredPlayerId);

    if (!Number.isInteger(ignoredPlayerId) || ignoredPlayerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    await db
      .delete(playerChatIgnoresTable)
      .where(
        and(
          eq(playerChatIgnoresTable.playerId, playerId),
          eq(playerChatIgnoresTable.ignoredPlayerId, ignoredPlayerId),
        ),
      );

    res.status(200).json({ success: true });
  },
);

export default router;
