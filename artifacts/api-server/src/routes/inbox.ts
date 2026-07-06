import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, playerInboxMessagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function serializeInboxMessage(row: typeof playerInboxMessagesTable.$inferSelect) {
  return {
    id: row.id,
    senderLabel: row.senderLabel,
    subject: row.subject,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/inbox/messages", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;

  const rows = await db
    .select()
    .from(playerInboxMessagesTable)
    .where(eq(playerInboxMessagesTable.playerId, playerId))
    .orderBy(desc(playerInboxMessagesTable.createdAt))
    .limit(100);

  res.status(200).json({ messages: rows.map(serializeInboxMessage) });
});

router.get("/inbox/unread-count", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(playerInboxMessagesTable)
    .where(
      and(
        eq(playerInboxMessagesTable.playerId, playerId),
        isNull(playerInboxMessagesTable.readAt),
      ),
    );

  res.status(200).json({ count: result?.count ?? 0 });
});

router.post(
  "/inbox/messages/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const playerId = req.session.playerId!;
    const messageId = Number(req.params.id);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "Invalid message id" });
      return;
    }

    const [updated] = await db
      .update(playerInboxMessagesTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(playerInboxMessagesTable.id, messageId),
          eq(playerInboxMessagesTable.playerId, playerId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(200).json({ message: serializeInboxMessage(updated) });
  },
);

export default router;
