import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  playersTable,
  chatMessagesTable,
  playerReportsTable,
  moderationRecordsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireStaff, requireAdmin } from "../middlewares/staff";
import {
  formatMuteDuration,
  isReportReason,
  isValidMuteDurationMinutes,
  parseMuteDurationMinutes,
  REPORT_REASON_LABELS,
  DEFAULT_MUTE_MINUTES,
  type ReportReason,
} from "../lib/moderation";
import {
  buildMuteInboxBody,
  buildBanInboxBody,
  buildUnbanInboxBody,
  sendPlayerInboxMessage,
} from "../lib/player-inbox";
import {
  formatBanDuration,
  isPermanentBanDate,
  isPlayerBanned,
  parseBanDurationMinutes,
  resolveBannedUntil,
} from "../lib/player-ban";

const router: IRouter = Router();
const CHAT_CLEAR_CHANNELS = ["all", "global", "trade", "help", "clan"] as const;
type ChatClearChannel = (typeof CHAT_CLEAR_CHANNELS)[number];

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reports. Please wait before submitting another." },
});

async function countPlayerMutes(playerId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(moderationRecordsTable)
    .where(
      and(
        eq(moderationRecordsTable.playerId, playerId),
        eq(moderationRecordsTable.action, "mute"),
      ),
    );

  return result?.count ?? 0;
}

async function applyMute(
  playerId: number,
  moderatorId: number,
  reason: string,
  durationMinutes: number,
  reportId?: number,
): Promise<{ mutedUntil: Date; durationMinutes: number; offenseNumber: number }> {
  const offenseNumber = (await countPlayerMutes(playerId)) + 1;
  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(playersTable)
      .set({ mutedUntil })
      .where(eq(playersTable.id, playerId));

    await tx.insert(moderationRecordsTable).values({
      playerId,
      moderatorId,
      action: "mute",
      reason,
      durationMinutes,
      reportId,
    });
  });

  return { mutedUntil, durationMinutes, offenseNumber };
}

async function postMuteGlobalAnnouncement(
  mutedUsername: string,
  durationMinutes: number,
  moderatorId: number,
): Promise<void> {
  const text = `${mutedUsername} has been muted for ${formatMuteDuration(durationMinutes)}.`;

  await db.insert(chatMessagesTable).values({
    channel: "global",
    playerId: moderatorId,
    username: "System",
    text,
    messageKind: "moderation",
  });
}

function assertCanBanTarget(
  target: { id: number; role: string },
  moderatorId: number,
): string | null {
  if (target.id === moderatorId) {
    return "You cannot ban yourself";
  }
  if (target.role === "admin") {
    return "Admins cannot be banned";
  }
  return null;
}

async function applyBan(
  playerId: number,
  moderatorId: number,
  reason: string,
  duration: number | "permanent",
  reportId?: number,
): Promise<{ bannedUntil: Date; durationMinutes: number | "permanent" }> {
  const bannedUntil = resolveBannedUntil(duration);
  const durationMinutes = duration === "permanent" ? null : duration;

  await db.transaction(async (tx) => {
    await tx
      .update(playersTable)
      .set({
        bannedUntil,
        banReason: reason,
        mutedUntil: null,
      })
      .where(eq(playersTable.id, playerId));

    await tx.insert(moderationRecordsTable).values({
      playerId,
      moderatorId,
      action: "ban",
      reason,
      durationMinutes,
      reportId,
    });
  });

  return { bannedUntil, durationMinutes: duration };
}

function serializeReport(row: typeof playerReportsTable.$inferSelect, extras?: {
  reporterUsername?: string;
  reportedUsername?: string;
  reportedPlayerRole?: string;
}) {
  return {
    id: row.id,
    reporterId: row.reporterId,
    reportedPlayerId: row.reportedPlayerId,
    reporterUsername: extras?.reporterUsername,
    reportedUsername: extras?.reportedUsername,
    reportedPlayerRole: extras?.reportedPlayerRole,
    channel: row.channel,
    messageId: row.messageId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

function serializeRecord(row: typeof moderationRecordsTable.$inferSelect, extras?: {
  moderatorUsername?: string;
}) {
  return {
    id: row.id,
    playerId: row.playerId,
    moderatorId: row.moderatorId,
    moderatorUsername: extras?.moderatorUsername,
    action: row.action,
    reason: row.reason,
    durationMinutes: row.durationMinutes,
    messageId: row.messageId,
    reportId: row.reportId,
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/moderation/reports", requireAuth, reportLimiter, async (req, res): Promise<void> => {
  const reporterId = req.session.playerId!;
  const reportedUsername =
    typeof req.body?.reportedUsername === "string"
      ? req.body.reportedUsername.trim()
      : "";
  const reason =
    typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  const details =
    typeof req.body?.details === "string" ? req.body.details.trim() : null;
  const channel =
    typeof req.body?.channel === "string" ? req.body.channel.trim() : null;
  const messageId =
    typeof req.body?.messageId === "number"
      ? req.body.messageId
      : typeof req.body?.messageId === "string" && req.body.messageId.trim()
        ? Number(req.body.messageId)
        : null;

  if (!reportedUsername || !isReportReason(reason)) {
    res.status(400).json({ error: "Invalid report payload" });
    return;
  }

  if (details && details.length > 500) {
    res.status(400).json({ error: "Details must be 500 characters or less" });
    return;
  }

  const [reportedPlayer] = await db
    .select({ id: playersTable.id, username: playersTable.username })
    .from(playersTable)
    .where(eq(playersTable.username, reportedUsername));

  if (!reportedPlayer) {
    res.status(404).json({ error: "Reported player not found" });
    return;
  }

  if (reportedPlayer.id === reporterId) {
    res.status(400).json({ error: "You cannot report yourself" });
    return;
  }

  const [inserted] = await db
    .insert(playerReportsTable)
    .values({
      reporterId,
      reportedPlayerId: reportedPlayer.id,
      channel,
      messageId: Number.isInteger(messageId) ? messageId : null,
      reason,
      details,
    })
    .returning();

  res.status(201).json({
    report: serializeReport(inserted!, {
      reportedUsername: reportedPlayer.username,
    }),
  });
});

router.get("/moderation/reports", requireStaff, async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status.trim() : "pending";

  const rows = await db
    .select({
      report: playerReportsTable,
      reporterUsername: playersTable.username,
    })
    .from(playerReportsTable)
    .innerJoin(playersTable, eq(playerReportsTable.reporterId, playersTable.id))
    .where(eq(playerReportsTable.status, status))
    .orderBy(desc(playerReportsTable.createdAt))
    .limit(50);

  const reports = await Promise.all(
    rows.map(async (row) => {
      const [reported] = await db
        .select({ username: playersTable.username, role: playersTable.role })
        .from(playersTable)
        .where(eq(playersTable.id, row.report.reportedPlayerId));

      return serializeReport(row.report, {
        reporterUsername: row.reporterUsername,
        reportedUsername: reported?.username,
        reportedPlayerRole: reported?.role,
      });
    }),
  );

  res.status(200).json({ reports });
});

router.get(
  "/moderation/reports/pending-count",
  requireStaff,
  async (_req, res): Promise<void> => {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerReportsTable)
      .where(eq(playerReportsTable.status, "pending"));

    res.status(200).json({ count: result?.count ?? 0 });
  },
);

router.get("/moderation/cheat-reports", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      report: playerReportsTable,
      reporterUsername: playersTable.username,
    })
    .from(playerReportsTable)
    .innerJoin(playersTable, eq(playerReportsTable.reporterId, playersTable.id))
    .where(
      and(
        eq(playerReportsTable.status, "pending"),
        eq(playerReportsTable.reason, "cheating"),
      ),
    )
    .orderBy(desc(playerReportsTable.createdAt))
    .limit(50);

  const reports = await Promise.all(
    rows.map(async (row) => {
      const [reported] = await db
        .select({
          username: playersTable.username,
          role: playersTable.role,
          bannedUntil: playersTable.bannedUntil,
        })
        .from(playersTable)
        .where(eq(playersTable.id, row.report.reportedPlayerId));

      return {
        ...serializeReport(row.report, {
          reporterUsername: row.reporterUsername,
          reportedUsername: reported?.username,
          reportedPlayerRole: reported?.role,
        }),
        reportedPlayerBanned: isPlayerBanned(reported?.bannedUntil),
      };
    }),
  );

  res.status(200).json({ reports });
});

router.post(
  "/moderation/reports/:reportId/mute",
  requireStaff,
  async (req, res): Promise<void> => {
    const reportId = Number(req.params.reportId);
    const moderatorId = req.session.playerId!;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : null;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const durationMinutes =
      parseMuteDurationMinutes(req.body?.durationMinutes) ??
      DEFAULT_MUTE_MINUTES;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({ error: "Invalid report id" });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: "Mute reason is required" });
      return;
    }

    if (!isValidMuteDurationMinutes(durationMinutes)) {
      res.status(400).json({
        error: "durationMinutes must be a positive multiple of 5 (min 5)",
      });
      return;
    }

    const [report] = await db
      .select()
      .from(playerReportsTable)
      .where(eq(playerReportsTable.id, reportId));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (report.status !== "pending") {
      res.status(400).json({ error: "Report is already resolved" });
      return;
    }

    const [reportedPlayer] = await db
      .select({
        username: playersTable.username,
        role: playersTable.role,
      })
      .from(playersTable)
      .where(eq(playersTable.id, report.reportedPlayerId));

    if (!reportedPlayer) {
      res.status(404).json({ error: "Reported player not found" });
      return;
    }

    const muteResult = await applyMute(
      report.reportedPlayerId,
      moderatorId,
      reason,
      durationMinutes,
      report.id,
    );

    try {
      await sendPlayerInboxMessage(
        report.reportedPlayerId,
        "Moderation Team",
        "Account Muted",
        buildMuteInboxBody(muteResult.durationMinutes, reason),
      );
    } catch (inboxError) {
      req.log.error(
        { inboxError, playerId: report.reportedPlayerId },
        "Failed to send mute inbox notification",
      );
    }

    if (reportedPlayer?.username) {
      try {
        await postMuteGlobalAnnouncement(
          reportedPlayer.username,
          muteResult.durationMinutes,
          moderatorId,
        );
      } catch (announcementError) {
        req.log.error(
          { announcementError, playerId: report.reportedPlayerId },
          "Failed to post mute global announcement",
        );
      }
    }

    const reportContext = `Report #${report.id}: ${REPORT_REASON_LABELS[report.reason as ReportReason] ?? report.reason}`;
    const resolutionNote =
      note ??
      `Muted for ${formatMuteDuration(muteResult.durationMinutes)} (offense #${muteResult.offenseNumber}). Context: ${reportContext}`;

    const [updated] = await db
      .update(playerReportsTable)
      .set({
        status: "resolved",
        resolvedBy: moderatorId,
        resolutionNote,
        resolvedAt: new Date(),
      })
      .where(eq(playerReportsTable.id, reportId))
      .returning();

    res.status(200).json({
      report: serializeReport(updated!),
      mute: {
        durationMinutes: muteResult.durationMinutes,
        mutedUntil: muteResult.mutedUntil.toISOString(),
        offenseNumber: muteResult.offenseNumber,
      },
    });
  },
);

router.post(
  "/moderation/reports/:reportId/dismiss",
  requireStaff,
  async (req, res): Promise<void> => {
    const reportId = Number(req.params.reportId);
    const moderatorId = req.session.playerId!;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : null;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({ error: "Invalid report id" });
      return;
    }

    const [report] = await db
      .select()
      .from(playerReportsTable)
      .where(eq(playerReportsTable.id, reportId));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (report.status !== "pending") {
      res.status(400).json({ error: "Report is already resolved" });
      return;
    }

    await db.insert(moderationRecordsTable).values({
      playerId: report.reportedPlayerId,
      moderatorId,
      action: "dismiss_report",
      reason: note ?? `Report #${report.id} dismissed`,
      reportId: report.id,
    });

    const [updated] = await db
      .update(playerReportsTable)
      .set({
        status: "dismissed",
        resolvedBy: moderatorId,
        resolutionNote: note ?? "Dismissed without action",
        resolvedAt: new Date(),
      })
      .where(eq(playerReportsTable.id, reportId))
      .returning();

    res.status(200).json({ report: serializeReport(updated!) });
  },
);

router.post(
  "/moderation/players/:playerId/mute",
  requireStaff,
  async (req, res): Promise<void> => {
    const playerId = Number(req.params.playerId);
    const moderatorId = req.session.playerId!;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const durationMinutes =
      parseMuteDurationMinutes(req.body?.durationMinutes) ??
      DEFAULT_MUTE_MINUTES;

    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: "Mute reason is required" });
      return;
    }

    if (!isValidMuteDurationMinutes(durationMinutes)) {
      res.status(400).json({
        error: "durationMinutes must be a positive multiple of 5 (min 5)",
      });
      return;
    }

    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        role: playersTable.role,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const muteResult = await applyMute(
      playerId,
      moderatorId,
      reason,
      durationMinutes,
    );

    try {
      await sendPlayerInboxMessage(
        playerId,
        "Moderation Team",
        "Account Muted",
        buildMuteInboxBody(muteResult.durationMinutes, reason),
      );
    } catch (inboxError) {
      req.log.error(
        { inboxError, playerId },
        "Failed to send mute inbox notification",
      );
    }

    try {
      await postMuteGlobalAnnouncement(
        player.username,
        muteResult.durationMinutes,
        moderatorId,
      );
    } catch (announcementError) {
      req.log.error(
        { announcementError, playerId },
        "Failed to post mute global announcement",
      );
    }

    res.status(200).json({
      mute: {
        durationMinutes: muteResult.durationMinutes,
        mutedUntil: muteResult.mutedUntil.toISOString(),
        offenseNumber: muteResult.offenseNumber,
      },
    });
  },
);

router.get("/moderation/muted-players", requireStaff, async (_req, res): Promise<void> => {
  const now = new Date();

  const rows = await db
    .select({
      id: playersTable.id,
      username: playersTable.username,
      role: playersTable.role,
      mutedUntil: playersTable.mutedUntil,
    })
    .from(playersTable)
    .where(gt(playersTable.mutedUntil, now))
    .orderBy(playersTable.mutedUntil);

  res.status(200).json({
    players: rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      mutedUntil: row.mutedUntil!.toISOString(),
    })),
  });
});

router.post(
  "/moderation/players/:playerId/unmute",
  requireAdmin,
  async (req, res): Promise<void> => {
    const playerId = Number(req.params.playerId);
    const moderatorId = req.session.playerId!;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : "";

    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        mutedUntil: playersTable.mutedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    if (!player.mutedUntil || player.mutedUntil.getTime() <= Date.now()) {
      res.status(400).json({ error: "Player is not currently muted" });
      return;
    }

    const reason = note || "Unmuted by admin";

    await db.transaction(async (tx) => {
      await tx
        .update(playersTable)
        .set({ mutedUntil: null })
        .where(eq(playersTable.id, playerId));

      await tx.insert(moderationRecordsTable).values({
        playerId,
        moderatorId,
        action: "unmute",
        reason,
      });
    });

    try {
      await sendPlayerInboxMessage(
        playerId,
        "Moderation Team",
        "Mute Lifted",
        "Your account mute has been lifted. You may use chat again.",
      );
    } catch (inboxError) {
      req.log.error(
        { inboxError, playerId },
        "Failed to send unmute inbox notification",
      );
    }

    res.status(200).json({
      player: {
        id: player.id,
        username: player.username,
        mutedUntil: null,
      },
    });
  },
);

router.get(
  "/moderation/players/:playerId/records",
  requireStaff,
  async (req, res): Promise<void> => {
    const playerId = Number(req.params.playerId);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        role: playersTable.role,
        mutedUntil: playersTable.mutedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const records = await db
      .select({
        record: moderationRecordsTable,
        moderatorUsername: playersTable.username,
      })
      .from(moderationRecordsTable)
      .innerJoin(
        playersTable,
        eq(moderationRecordsTable.moderatorId, playersTable.id),
      )
      .where(eq(moderationRecordsTable.playerId, playerId))
      .orderBy(desc(moderationRecordsTable.createdAt))
      .limit(50);

    const muteCount = await countPlayerMutes(playerId);

    res.status(200).json({
      player: {
        id: player.id,
        username: player.username,
        role: player.role,
        mutedUntil: player.mutedUntil?.toISOString() ?? null,
        muteCount,
      },
      records: records.map((row) =>
        serializeRecord(row.record, {
          moderatorUsername: row.moderatorUsername,
        }),
      ),
    });
  },
);

router.delete(
  "/moderation/chat-messages/:messageId",
  requireStaff,
  async (req, res): Promise<void> => {
    const messageId = Number(req.params.messageId);
    const moderatorId = req.session.playerId!;
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim()
        ? req.body.reason.trim()
        : "Chat line removed by staff";

    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "Invalid message id" });
      return;
    }

    const [message] = await db
      .select()
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.id, messageId),
          isNull(chatMessagesTable.deletedAt),
        ),
      );

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(chatMessagesTable)
        .set({ deletedAt: new Date(), deletedBy: moderatorId })
        .where(eq(chatMessagesTable.id, messageId));

      await tx.insert(moderationRecordsTable).values({
        playerId: message.playerId,
        moderatorId,
        action: "delete_message",
        reason,
        messageId,
      });
    });

    res.status(200).json({ success: true });
  },
);

router.post(
  "/moderation/chat/clear",
  requireAdmin,
  async (req, res): Promise<void> => {
    const moderatorId = req.session.playerId!;
    const channelRaw =
      typeof req.body?.channel === "string" ? req.body.channel.trim().toLowerCase() : "all";
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim()
        ? req.body.reason.trim()
        : "Chat cleared by admin";

    if (!(CHAT_CLEAR_CHANNELS as readonly string[]).includes(channelRaw)) {
      res.status(400).json({ error: "Invalid channel" });
      return;
    }

    const channel = channelRaw as ChatClearChannel;
    const now = new Date();

    const whereClause =
      channel === "all"
        ? isNull(chatMessagesTable.deletedAt)
        : and(
            eq(chatMessagesTable.channel, channel),
            isNull(chatMessagesTable.deletedAt),
          );

    const clearedRows = await db
      .update(chatMessagesTable)
      .set({ deletedAt: now, deletedBy: moderatorId })
      .where(whereClause)
      .returning({ id: chatMessagesTable.id });

    await db.insert(moderationRecordsTable).values({
      playerId: moderatorId,
      moderatorId,
      action: "clear_chat",
      reason: `${reason} (${channel})`,
    });

    res.status(200).json({
      success: true,
      clearedCount: clearedRows.length,
      channel,
    });
  },
);

router.post(
  "/moderation/players/:playerId/ban",
  requireAdmin,
  async (req, res): Promise<void> => {
    const playerId = Number(req.params.playerId);
    const moderatorId = req.session.playerId!;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const duration = parseBanDurationMinutes(req.body?.durationMinutes);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: "Ban reason is required" });
      return;
    }

    if (duration === null) {
      res.status(400).json({
        error:
          "durationMinutes must be 1440 (1 day), 10080 (7 days), 43200 (30 days), or permanent",
      });
      return;
    }

    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        role: playersTable.role,
        bannedUntil: playersTable.bannedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const banBlock = assertCanBanTarget(player, moderatorId);
    if (banBlock) {
      res.status(400).json({ error: banBlock });
      return;
    }

    if (isPlayerBanned(player.bannedUntil)) {
      res.status(400).json({ error: "Player is already banned" });
      return;
    }

    const banResult = await applyBan(playerId, moderatorId, reason, duration);

    try {
      await sendPlayerInboxMessage(
        playerId,
        "Moderation Team",
        "Account Banned",
        buildBanInboxBody(banResult.bannedUntil, reason, banResult.durationMinutes),
      );
    } catch (inboxError) {
      req.log.error({ inboxError, playerId }, "Failed to send ban inbox notification");
    }

    res.status(200).json({
      ban: {
        durationMinutes:
          banResult.durationMinutes === "permanent"
            ? null
            : banResult.durationMinutes,
        bannedUntil: banResult.bannedUntil.toISOString(),
        permanent: banResult.durationMinutes === "permanent",
      },
      player: {
        id: player.id,
        username: player.username,
      },
    });
  },
);

router.post(
  "/moderation/reports/:reportId/ban",
  requireAdmin,
  async (req, res): Promise<void> => {
    const reportId = Number(req.params.reportId);
    const moderatorId = req.session.playerId!;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : null;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const duration = parseBanDurationMinutes(req.body?.durationMinutes);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({ error: "Invalid report id" });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: "Ban reason is required" });
      return;
    }

    if (duration === null) {
      res.status(400).json({
        error:
          "durationMinutes must be 1440 (1 day), 10080 (7 days), 43200 (30 days), or permanent",
      });
      return;
    }

    const [report] = await db
      .select()
      .from(playerReportsTable)
      .where(eq(playerReportsTable.id, reportId));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (report.status !== "pending") {
      res.status(400).json({ error: "Report is already resolved" });
      return;
    }

    const [reportedPlayer] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        role: playersTable.role,
        bannedUntil: playersTable.bannedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, report.reportedPlayerId));

    if (!reportedPlayer) {
      res.status(404).json({ error: "Reported player not found" });
      return;
    }

    const banBlock = assertCanBanTarget(reportedPlayer, moderatorId);
    if (banBlock) {
      res.status(400).json({ error: banBlock });
      return;
    }

    if (isPlayerBanned(reportedPlayer.bannedUntil)) {
      res.status(400).json({ error: "Player is already banned" });
      return;
    }

    const banResult = await applyBan(
      report.reportedPlayerId,
      moderatorId,
      reason,
      duration,
      report.id,
    );

    try {
      await sendPlayerInboxMessage(
        report.reportedPlayerId,
        "Moderation Team",
        "Account Banned",
        buildBanInboxBody(banResult.bannedUntil, reason, banResult.durationMinutes),
      );
    } catch (inboxError) {
      req.log.error(
        { inboxError, playerId: report.reportedPlayerId },
        "Failed to send ban inbox notification",
      );
    }

    const reportContext = `Report #${report.id}: ${REPORT_REASON_LABELS[report.reason as ReportReason] ?? report.reason}`;
    const durationLabel =
      banResult.durationMinutes === "permanent"
        ? "permanent"
        : formatBanDuration(banResult.durationMinutes);
    const resolutionNote =
      note ??
      `Banned (${durationLabel}). Context: ${reportContext}`;

    const [updated] = await db
      .update(playerReportsTable)
      .set({
        status: "resolved",
        resolvedBy: moderatorId,
        resolutionNote,
        resolvedAt: new Date(),
      })
      .where(eq(playerReportsTable.id, reportId))
      .returning();

    res.status(200).json({
      report: serializeReport(updated!),
      ban: {
        durationMinutes:
          banResult.durationMinutes === "permanent"
            ? null
            : banResult.durationMinutes,
        bannedUntil: banResult.bannedUntil.toISOString(),
        permanent: banResult.durationMinutes === "permanent",
      },
    });
  },
);

router.get("/moderation/banned-players", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();

  const rows = await db
    .select({
      id: playersTable.id,
      username: playersTable.username,
      role: playersTable.role,
      bannedUntil: playersTable.bannedUntil,
      banReason: playersTable.banReason,
    })
    .from(playersTable)
    .where(gt(playersTable.bannedUntil, now))
    .orderBy(playersTable.bannedUntil);

  res.status(200).json({
    players: rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      bannedUntil: row.bannedUntil!.toISOString(),
      banReason: row.banReason ?? "",
      permanent: isPermanentBanDate(row.bannedUntil!),
    })),
  });
});

router.post(
  "/moderation/players/:playerId/unban",
  requireAdmin,
  async (req, res): Promise<void> => {
    const playerId = Number(req.params.playerId);
    const moderatorId = req.session.playerId!;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : "";

    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "Invalid player id" });
      return;
    }

    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        bannedUntil: playersTable.bannedUntil,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    if (!isPlayerBanned(player.bannedUntil)) {
      res.status(400).json({ error: "Player is not currently banned" });
      return;
    }

    const reason = note || "Unbanned by admin";

    await db.transaction(async (tx) => {
      await tx
        .update(playersTable)
        .set({ bannedUntil: null, banReason: null })
        .where(eq(playersTable.id, playerId));

      await tx.insert(moderationRecordsTable).values({
        playerId,
        moderatorId,
        action: "unban",
        reason,
      });
    });

    try {
      await sendPlayerInboxMessage(
        playerId,
        "Moderation Team",
        "Ban Lifted",
        buildUnbanInboxBody(note),
      );
    } catch (inboxError) {
      req.log.error({ inboxError, playerId }, "Failed to send unban inbox notification");
    }

    res.status(200).json({
      player: {
        id: player.id,
        username: player.username,
        bannedUntil: null,
        banReason: null,
      },
    });
  },
);

export default router;
