import { customFetch } from "@workspace/api-client-react";
import type { Player } from "@workspace/api-client-react";

export type ReportReason =
  | "harassment"
  | "spam"
  | "cheating"
  | "inappropriate"
  | "other";

export type PlayerReport = {
  id: number;
  reporterId: number;
  reportedPlayerId: number;
  reporterUsername?: string;
  reportedUsername?: string;
  channel?: string | null;
  messageId?: number | null;
  reason: ReportReason;
  details?: string | null;
  status: string;
  resolutionNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
};

export type ModerationRecord = {
  id: number;
  playerId: number;
  moderatorId: number;
  moderatorUsername?: string;
  action: string;
  reason: string;
  durationMinutes?: number | null;
  messageId?: number | null;
  reportId?: number | null;
  createdAt: string;
};

export type SubmitReportBody = {
  reportedUsername: string;
  reason: ReportReason;
  details?: string;
  channel?: string;
  messageId?: number;
};

export function submitPlayerReport(body: SubmitReportBody) {
  return customFetch<{ report: PlayerReport }>("/api/moderation/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listPendingReports() {
  return customFetch<{ reports: PlayerReport[] }>(
    "/api/moderation/reports?status=pending",
    { method: "GET" },
  );
}

export function getPendingReportCount() {
  return customFetch<{ count: number }>(
    "/api/moderation/reports/pending-count",
    { method: "GET" },
  );
}

export function muteFromReport(reportId: number, note?: string) {
  return customFetch<{
    report: PlayerReport;
    mute: {
      durationMinutes: number;
      mutedUntil: string;
      offenseNumber: number;
    };
  }>(`/api/moderation/reports/${reportId}/mute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}

export function dismissReport(reportId: number, note?: string) {
  return customFetch<{ report: PlayerReport }>(
    `/api/moderation/reports/${reportId}/dismiss`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    },
  );
}

export function deleteChatMessage(messageId: number, reason?: string) {
  return customFetch<{ success: boolean }>(
    `/api/moderation/chat-messages/${messageId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
}

export function getPlayerModerationRecords(playerId: number) {
  return customFetch<{
    player: {
      id: number;
      username: string;
      role: string;
      mutedUntil: string | null;
      muteCount: number;
    };
    records: ModerationRecord[];
  }>(`/api/moderation/players/${playerId}/records`, { method: "GET" });
}

export function isStaffRole(role?: string | null): boolean {
  return role === "mod" || role === "admin";
}

export function isGuideRole(role?: string | null): boolean {
  return role === "guide";
}

export function canShowStaffChatTag(role?: string | null): boolean {
  return role === "mod" || role === "admin" || role === "guide";
}

export function updatePlayerPreferences(showStaffChatTag: boolean) {
  return customFetch<Player>("/api/players/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showStaffChatTag }),
  });
}

export function formatMuteDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (24 * 60))}d`;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment",
  spam: "Spam",
  cheating: "Cheating",
  inappropriate: "Inappropriate content",
  other: "Other",
};

export const MUTE_ESCALATION_LABELS = ["15m", "1h", "24h", "7d"];
