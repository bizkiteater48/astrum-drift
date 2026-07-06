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

export const MUTE_DURATION_MIN = 5;
export const MUTE_DURATION_MAX = 7 * 24 * 60;
export const MUTE_DURATION_STEP = 5;
export const DEFAULT_MUTE_MINUTES = 5;

export function isPlayerRole(value: string): value is PlayerRole {
  return (PLAYER_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: string): boolean {
  return role === "mod" || role === "admin";
}

export function canBeChatIgnored(role: string): boolean {
  return !isStaffRole(role);
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

export function getStaffChatDisplayName(role: string): string | null {
  if (role === "admin") return "ADMIN";
  if (role === "mod") return "MOD";
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

export function isValidMuteDurationMinutes(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MUTE_DURATION_MIN &&
    value <= MUTE_DURATION_MAX &&
    value % MUTE_DURATION_STEP === 0
  );
}

export function parseMuteDurationMinutes(raw: unknown): number | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : NaN;

  if (!isValidMuteDurationMinutes(value)) {
    return null;
  }

  return value;
}

export function getSuggestedMuteMinutes(_previousMuteCount: number): number {
  return DEFAULT_MUTE_MINUTES;
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
