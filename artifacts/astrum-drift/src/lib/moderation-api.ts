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
  reportedPlayerRole?: string;
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

export const MUTE_DURATION_MIN = 5;
export const MUTE_DURATION_MAX = 7 * 24 * 60;
export const MUTE_DURATION_STEP = 5;
export const DEFAULT_MUTE_MINUTES = 5;

export function getSuggestedMuteMinutes(_previousMuteCount: number): number {
  return DEFAULT_MUTE_MINUTES;
}

export const MUTE_DURATION_PRESETS = [
  5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320,
  MUTE_DURATION_MAX,
] as const;

export function buildMuteDurationOptions(): number[] {
  const options: number[] = [];
  for (
    let minutes = MUTE_DURATION_MIN;
    minutes <= MUTE_DURATION_MAX;
    minutes += MUTE_DURATION_STEP
  ) {
    options.push(minutes);
  }
  return options;
}

export const MUTE_DURATION_OPTIONS = buildMuteDurationOptions();

export function formatMuteDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const hours = minutes / 60;
    return hours === Math.floor(hours) ? `${hours} hr` : `${hours} hr`;
  }
  const days = minutes / (24 * 60);
  return days === Math.floor(days) ? `${days} day${days === 1 ? "" : "s"}` : `${days} days`;
}

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

export type MuteFromReportBody = {
  reason: string;
  durationMinutes?: number;
  note?: string;
};

export function muteFromReport(reportId: number, body: MuteFromReportBody) {
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
    body: JSON.stringify(body),
  });
}

export type MutePlayerBody = {
  reason: string;
  durationMinutes?: number;
};

export function mutePlayer(playerId: number, body: MutePlayerBody) {
  return customFetch<{
    mute: {
      durationMinutes: number;
      mutedUntil: string;
      offenseNumber: number;
    };
  }>(`/api/moderation/players/${playerId}/mute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export type ClearChatChannel = "all" | "global" | "trade" | "help" | "clan";

export function clearChat(channel: ClearChatChannel, reason?: string) {
  return customFetch<{ success: boolean; clearedCount: number; channel: ClearChatChannel }>(
    "/api/moderation/chat/clear",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, reason }),
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

export type MutedPlayer = {
  id: number;
  username: string;
  role: string;
  mutedUntil: string;
};

export function listMutedPlayers() {
  return customFetch<{ players: MutedPlayer[] }>("/api/moderation/muted-players", {
    method: "GET",
  });
}

export function unmutePlayer(playerId: number, note?: string) {
  return customFetch<{
    player: {
      id: number;
      username: string;
      mutedUntil: null;
    };
  }>(`/api/moderation/players/${playerId}/unmute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}

export function isStaffRole(role?: string | null): boolean {
  return role === "mod" || role === "admin";
}

export function isAdminRole(role?: string | null): boolean {
  return role === "admin";
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

export function formatMuteTimeRemaining(
  mutedUntil: string,
  nowMs: number = Date.now(),
): string {
  const remainingMs = new Date(mutedUntil).getTime() - nowMs;
  if (remainingMs <= 0) return "Expired";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min remaining`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours} hr ${minutes} min remaining` : `${hours} hr remaining`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours > 0) {
    return `${days} day${days === 1 ? "" : "s"} ${remHours} hr remaining`;
  }
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment",
  spam: "Spam",
  cheating: "Cheating",
  inappropriate: "Inappropriate content",
  other: "Other",
};

export type BanDuration = 1440 | 10080 | 43200 | "permanent";

export const BAN_DURATION_PRESETS: { value: BanDuration; label: string }[] = [
  { value: 1440, label: "1 day" },
  { value: 10080, label: "7 days" },
  { value: 43200, label: "30 days" },
  { value: "permanent", label: "Permanent" },
];

export type BannedPlayer = {
  id: number;
  username: string;
  role: string;
  bannedUntil: string;
  banReason: string;
  permanent: boolean;
};

export type CheatReport = PlayerReport & {
  reportedPlayerBanned?: boolean;
};

export function listCheatReports() {
  return customFetch<{ reports: CheatReport[] }>("/api/moderation/cheat-reports", {
    method: "GET",
  });
}

export function listBannedPlayers() {
  return customFetch<{ players: BannedPlayer[] }>("/api/moderation/banned-players", {
    method: "GET",
  });
}

export type BanPlayerBody = {
  reason: string;
  durationMinutes: BanDuration;
  note?: string;
};

export function banPlayer(playerId: number, body: BanPlayerBody) {
  return customFetch<{
    ban: {
      durationMinutes: number | null;
      bannedUntil: string;
      permanent: boolean;
    };
    player: { id: number; username: string };
  }>(`/api/moderation/players/${playerId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function banFromReport(reportId: number, body: BanPlayerBody) {
  return customFetch<{
    report: PlayerReport;
    ban: {
      durationMinutes: number | null;
      bannedUntil: string;
      permanent: boolean;
    };
  }>(`/api/moderation/reports/${reportId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function unbanPlayer(playerId: number, note?: string) {
  return customFetch<{
    player: {
      id: number;
      username: string;
      bannedUntil: null;
      banReason: null;
    };
  }>(`/api/moderation/players/${playerId}/unban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}

export function formatBanTimeRemaining(
  bannedUntil: string,
  permanent?: boolean,
  nowMs: number = Date.now(),
): string {
  if (permanent) return "Permanent ban";

  const remainingMs = new Date(bannedUntil).getTime() - nowMs;
  if (remainingMs <= 0) return "Expired";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min remaining`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours} hr ${minutes} min remaining` : `${hours} hr remaining`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours > 0) {
    return `${days} day${days === 1 ? "" : "s"} ${remHours} hr remaining`;
  }
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}
