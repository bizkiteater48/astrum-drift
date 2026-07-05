import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, desc, eq, gt, gte, isNull, lt } from "drizzle-orm";
import { db, chatMessagesTable, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

export const CHAT_CHANNELS = ["global", "trade", "clan", "help"] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_MESSAGE_LIMIT = 100;
const HISTORY_DAY_LIMIT = 500;

const HISTORY_DAYS = ["today", "yesterday"] as const;
type HistoryDay = (typeof HISTORY_DAYS)[number];

function isHistoryDay(value: string): value is HistoryDay {
  return (HISTORY_DAYS as readonly string[]).includes(value);
}

function getUtcDayRange(day: HistoryDay): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const todayStart = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));

  if (day === "today") {
    return {
      start: todayStart,
      end: new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0)),
    };
  }

  return {
    start: new Date(Date.UTC(year, month, date - 1, 0, 0, 0, 0)),
    end: todayStart,
  };
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
  const dayRaw = req.query.day;
  const day =
    typeof dayRaw === "string" && dayRaw.trim() !== ""
      ? dayRaw.trim()
      : undefined;
  const limitRaw = req.query.limit;
  const historyDay = day && isHistoryDay(day) ? day : undefined;

  if (day && !historyDay) {
    res.status(400).json({ error: "Invalid history day" });
    return;
  }

  const limit = Math.min(
    typeof limitRaw === "string"
      ? Number(limitRaw) ||
        (historyDay ? HISTORY_DAY_LIMIT : DEFAULT_MESSAGE_LIMIT)
      : historyDay
        ? HISTORY_DAY_LIMIT
        : DEFAULT_MESSAGE_LIMIT,
    historyDay ? HISTORY_DAY_LIMIT : DEFAULT_MESSAGE_LIMIT,
  );

  if (after !== undefined && (!Number.isInteger(after) || after < 0)) {
    res.status(400).json({ error: "Invalid after cursor" });
    return;
  }

  try {
    if (historyDay) {
      const { start, end } = getUtcDayRange(historyDay);
      const rows = await db
        .select()
        .from(chatMessagesTable)
        .where(
          and(
            eq(chatMessagesTable.channel, channel),
            gte(chatMessagesTable.createdAt, start),
            lt(chatMessagesTable.createdAt, end),
            isNull(chatMessagesTable.deletedAt),
          ),
        )
        .orderBy(asc(chatMessagesTable.id))
        .limit(limit);

      res.status(200).json({ messages: rows.map(serializeChatMessage) });
      return;
    }

    if (after !== undefined) {
      const rows = await db
        .select()
        .from(chatMessagesTable)
        .where(
          and(
            eq(chatMessagesTable.channel, channel),
            gt(chatMessagesTable.id, after),
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
          isNull(chatMessagesTable.deletedAt),
        ),
      )
      .orderBy(desc(chatMessagesTable.id))
      .limit(limit);

    rows.reverse();
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
