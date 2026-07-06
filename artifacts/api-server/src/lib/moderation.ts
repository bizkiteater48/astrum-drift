export const PLAYER_ROLES = ["player", "mod", "admin", "guide"] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const STAFF_CHAT_TAGS = ["MOD", "ADMIN", "GUIDE"] as const;
export type StaffChatTag = (typeof STAFF_CHAT_TAGS)[number];

export const REPORT_REASONS = [
  "harassment",
  "spam",
  "cheating",
  "inappropriate",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MUTE_ESCALATION_MINUTES = [15, 60, 24 * 60, 7 * 24 * 60] as const;

export function isPlayerRole(value: string): value is PlayerRole {
  return (PLAYER_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: string): boolean {
  return role === "mod" || role === "admin";
}

export function isGuideRole(role: string): boolean {
  return role === "guide";
}

export function canShowStaffChatTag(role: string): boolean {
  return role === "mod" || role === "admin" || role === "guide";
}

export function getStaffChatTagForRole(role: string): StaffChatTag | null {
  if (role === "admin") return "ADMIN";
  if (role === "mod") return "MOD";
  if (role === "guide") return "GUIDE";
  return null;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment",
  spam: "Spam",
  cheating: "Cheating",
  inappropriate: "Inappropriate content",
  other: "Other",
};

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

export function getEscalatedMuteMinutes(previousMuteCount: number): number {
  const index = Math.min(
    Math.max(previousMuteCount, 0),
    MUTE_ESCALATION_MINUTES.length - 1,
  );
  return MUTE_ESCALATION_MINUTES[index];
}

export function formatMuteDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes < 24 * 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(minutes / (24 * 60));
  return `${days} day${days === 1 ? "" : "s"}`;
}
