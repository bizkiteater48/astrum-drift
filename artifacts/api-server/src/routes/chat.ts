import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, desc, eq, gt, gte, isNull } from "drizzle-orm";
import { db, chatMessagesTable, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  canShowStaffChatTag,
  getStaffChatDisplayName,
  getStaffChatTagForRole,
} from "../lib/moderation";

const router: IRouter = Router();

export const CHAT_CHANNELS = ["global", "trade", "clan", "help"] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

const MAX_MESSAGE_LENGTH = 500;
const LIVE_MESSAGE_LIMIT = 100;
const HISTORY_MESSAGE_LIMIT = 500;
const HISTORY_HOURS_DEFAULT = 24;

function getRollingWindowStart(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function parseRollingHours(raw: unknown): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    return HISTORY_HOURS_DEFAULT;
  }

  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
    return HISTORY_HOURS_DEFAULT;
  }

  return hours;
}

function hasRollingHoursQuery(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim() !== "";
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

function serializeChatMessage(
  row: typeof chatMessagesTable.$inferSelect,
  authorRole: string,
) {
  return {
    id: row.id,
    channel: row.channel as ChatChannel,
    author: row.username,
    authorId: row.playerId,
    authorRole,
    text: row.text,
    sentAt: row.createdAt.toISOString(),
    authorStaffTag: row.authorStaffTag ?? null,
    messageKind: (row.messageKind ?? "user") as "user" | "moderation" | "staff",
  };
}

async function fetchChatMessages(
  whereClause: ReturnType<typeof and>,
  orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>,
  limit: number,
) {
  const rows = await db
    .select({
      message: chatMessagesTable,
      authorRole: playersTable.role,
    })
    .from(chatMessagesTable)
    .innerJoin(playersTable, eq(chatMessagesTable.playerId, playersTable.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit);

  return rows.map((row) => serializeChatMessage(row.message, row.authorRole));
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
  const useRollingWindow = hasRollingHoursQuery(req.query.hours);
  const rollingHours = parseRollingHours(req.query.hours);

  const maxLimit = useRollingWindow ? HISTORY_MESSAGE_LIMIT : LIVE_MESSAGE_LIMIT;
  const limit = Math.min(
    typeof limitRaw === "string" ? Number(limitRaw) || maxLimit : maxLimit,
    maxLimit,
  );

  if (after !== undefined && (!Number.isInteger(after) || after < 0)) {
    res.status(400).json({ error: "Invalid after cursor" });
    return;
  }

  try {
    if (after !== undefined) {
      const messages = await fetchChatMessages(
        and(
          eq(chatMessagesTable.channel, channel),
          gt(chatMessagesTable.id, after),
          isNull(chatMessagesTable.deletedAt),
        ),
        asc(chatMessagesTable.id),
        limit,
      );

      res.status(200).json({ messages });
      return;
    }

    if (useRollingWindow) {
      const windowStart = getRollingWindowStart(rollingHours);
      const messages = await fetchChatMessages(
        and(
          eq(chatMessagesTable.channel, channel),
          gte(chatMessagesTable.createdAt, windowStart),
          isNull(chatMessagesTable.deletedAt),
        ),
        asc(chatMessagesTable.id),
        limit,
      );

      res.status(200).json({ messages });
      return;
    }

    const messages = await fetchChatMessages(
      and(
        eq(chatMessagesTable.channel, channel),
        isNull(chatMessagesTable.deletedAt),
      ),
      desc(chatMessagesTable.id),
      limit,
    );

    res.status(200).json({ messages });
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
        role: playersTable.role,
        showStaffChatTag: playersTable.showStaffChatTag,
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
      let displayUsername = player.username;
      let authorStaffTag: string | null = null;
      let messageKind: "user" | "staff" = "user";

      const staffDisplayName = getStaffChatDisplayName(player.role);
      if (staffDisplayName) {
        displayUsername = staffDisplayName;
        messageKind = "staff";
      } else if (player.showStaffChatTag && canShowStaffChatTag(player.role)) {
        authorStaffTag = getStaffChatTagForRole(player.role);
      }

      const [inserted] = await db
        .insert(chatMessagesTable)
        .values({
          channel,
          playerId,
          username: displayUsername,
          text,
          authorStaffTag,
          messageKind,
        })
        .returning();

      res.status(201).json({
        message: serializeChatMessage(inserted!, player.role),
      });
    } catch (err) {
      req.log.error({ err, channel, playerId }, "Failed to send chat message");
      res.status(503).json({ error: "Chat is temporarily unavailable" });
    }
  },
);

export default router;
