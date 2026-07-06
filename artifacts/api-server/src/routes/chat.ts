import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, eq, gt, gte, isNull } from "drizzle-orm";
import { db, chatMessagesTable, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

export const CHAT_CHANNELS = ["global", "trade", "clan", "help"] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

const MAX_MESSAGE_LENGTH = 500;
const CHAT_ROLLING_HOURS = 24;
const CHAT_ROLLING_LIMIT = 500;

function getRollingWindowStart(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function parseRollingHours(raw: unknown): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    return CHAT_ROLLING_HOURS;
  }

  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
    return CHAT_ROLLING_HOURS;
  }

  return hours;
}

const chatSendLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat messages. Slow down." },
});

function isChatChannel(value: string): value is ChatChannel {
  return (CHAT_CHANNELS as readonly string[]).includes(value);
}

function serializeChatMessage(row: typeof chatMessagesTable.$inferSelect) {
  return {
    id: row.id,
    channel: row.channel as ChatChannel,
    author: row.username,
    text: row.text,
    sentAt: row.createdAt.toISOString(),
  };
}

router.get("/chat/:channel/messages", requireAuth, async (req, res): Promise<void> => {
  const channel = req.params.channel;
  if (!isChatChannel(channel)) {
    res.status(400).json({ error: "Invalid chat channel" });
    return;
  }

  const afterRaw = req.query.after;
  const after =
    typeof afterRaw === "string" && afterRaw.trim() !== ""
      ? Number(afterRaw)
      : undefined;
  const limitRaw = req.query.limit;
  const rollingHours = parseRollingHours(req.query.hours);

  const limit = Math.min(
    typeof limitRaw === "string" ? Number(limitRaw) || CHAT_ROLLING_LIMIT : CHAT_ROLLING_LIMIT,
    CHAT_ROLLING_LIMIT,
  );

  if (after !== undefined && (!Number.isInteger(after) || after < 0)) {
    res.status(400).json({ error: "Invalid after cursor" });
    return;
  }

  try {
    const windowStart = getRollingWindowStart(rollingHours);

    if (after !== undefined) {
      const rows = await db
        .select()
        .from(chatMessagesTable)
        .where(
          and(
            eq(chatMessagesTable.channel, channel),
            gt(chatMessagesTable.id, after),
            gte(chatMessagesTable.createdAt, windowStart),
            isNull(chatMessagesTable.deletedAt),
          ),
        )
        .orderBy(asc(chatMessagesTable.id))
        .limit(limit);

      res.status(200).json({ messages: rows.map(serializeChatMessage) });
      return;
    }

    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.channel, channel),
          gte(chatMessagesTable.createdAt, windowStart),
          isNull(chatMessagesTable.deletedAt),
        ),
      )
      .orderBy(asc(chatMessagesTable.id))
      .limit(limit);

    res.status(200).json({ messages: rows.map(serializeChatMessage) });
  } catch (err) {
    req.log.error({ err, channel }, "Failed to load chat messages");
    res.status(503).json({ error: "Chat is temporarily unavailable" });
  }
});

router.post(
  "/chat/:channel/messages",
  requireAuth,
  chatSendLimiter,
  async (req, res): Promise<void> => {
    const channel = req.params.channel;
    if (!isChatChannel(channel)) {
      res.status(400).json({ error: "Invalid chat channel" });
      return;
    }

    if (channel === "clan") {
      res.status(403).json({ error: "Clan chat requires clan membership" });
      return;
    }

    const rawText = req.body?.text;
    const text = typeof rawText === "string" ? rawText.trim() : "";
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: "Message must be 1–500 characters" });
      return;
    }

    const playerId = req.session.playerId!;
    const [player] = await db
      .select({
        username: playersTable.username,
        mutedUntil: playersTable.mutedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (player.mutedUntil && player.mutedUntil.getTime() > Date.now()) {
      res.status(403).json({
        error: `You are muted until ${player.mutedUntil.toISOString()}`,
      });
      return;
    }

    try {
      const [inserted] = await db
        .insert(chatMessagesTable)
        .values({
          channel,
          playerId,
          username: player.username,
          text,
        })
        .returning();

      res.status(201).json({ message: serializeChatMessage(inserted!) });
    } catch (err) {
      req.log.error({ err, channel, playerId }, "Failed to send chat message");
      res.status(503).json({ error: "Chat is temporarily unavailable" });
    }
  },
);

export default router;
