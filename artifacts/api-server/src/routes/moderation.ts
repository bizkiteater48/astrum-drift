import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  playersTable,
  chatMessagesTable,
  playerReportsTable,
  moderationRecordsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireStaff } from "../middlewares/staff";
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
  sendPlayerInboxMessage,
} from "../lib/player-inbox";

const router: IRouter = Router();

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
  reason: string,
  moderatorId: number,
): Promise<void> {
  const text = `${mutedUsername} has been muted for ${formatMuteDuration(durationMinutes)}. Reason: ${reason}`;

  await db.insert(chatMessagesTable).values({
    channel: "global",
    playerId: moderatorId,
    username: "System",
    text,
    messageKind: "moderation",
  });
}

function serializeReport(row: typeof playerReportsTable.$inferSelect, extras?: {
  reporterUsername?: string;
  reportedUsername?: string;
}) {
  return {
    id: row.id,
    reporterId: row.reporterId,
    reportedPlayerId: row.reportedPlayerId,
    reporterUsername: extras?.reporterUsername,
    reportedUsername: extras?.reportedUsername,
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
        .select({ username: playersTable.username })
        .from(playersTable)
        .where(eq(playersTable.id, row.report.reportedPlayerId));

      return serializeReport(row.report, {
        reporterUsername: row.reporterUsername,
        reportedUsername: reported?.username,
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
      .select({ username: playersTable.username })
      .from(playersTable)
      .where(eq(playersTable.id, report.reportedPlayerId));

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
          reason,
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
      .select({ id: playersTable.id, username: playersTable.username })
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
        reason,
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

export default router;
