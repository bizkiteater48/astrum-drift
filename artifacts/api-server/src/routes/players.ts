import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializePlayer } from "../lib/player";
import { canShowStaffChatTag } from "../lib/moderation";

const router: IRouter = Router();

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
