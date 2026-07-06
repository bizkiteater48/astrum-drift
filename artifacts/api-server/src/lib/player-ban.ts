/** Bans at or beyond this instant are treated as permanent. */
export const PERMANENT_BAN_UNTIL = new Date("2099-01-01T00:00:00.000Z");

export const BAN_DURATION_MINUTES = 24 * 60;
export const BAN_DURATION_MAX_MINUTES = 365 * 24 * 60;

export function isPermanentBanDate(bannedUntil: Date): boolean {
  return bannedUntil.getTime() >= PERMANENT_BAN_UNTIL.getTime();
}

export function isPlayerBanned(
  bannedUntil: Date | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!bannedUntil) return false;
  return bannedUntil.getTime() > nowMs;
}

export function parseBanDurationMinutes(raw: unknown): number | "permanent" | null {
  if (raw === "permanent" || raw === true) return "permanent";

  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? raw.trim() === "permanent"
          ? "permanent"
          : Number(raw)
        : NaN;

  if (value === "permanent") return "permanent";

  if (
    !Number.isInteger(value) ||
    value < BAN_DURATION_MINUTES ||
    value > BAN_DURATION_MAX_MINUTES
  ) {
    return null;
  }

  return value;
}

export function resolveBannedUntil(
  duration: number | "permanent",
): Date {
  if (duration === "permanent") {
    return PERMANENT_BAN_UNTIL;
  }
  return new Date(Date.now() + duration * 60 * 1000);
}

export function formatBanDuration(minutes: number | "permanent"): string {
  if (minutes === "permanent") return "permanent";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes < 24 * 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(minutes / (24 * 60));
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatBanTimeRemaining(
  bannedUntil: string | Date,
  nowMs: number = Date.now(),
): string {
  const until =
    typeof bannedUntil === "string" ? new Date(bannedUntil) : bannedUntil;

  if (isPermanentBanDate(until)) return "Permanent ban";

  const remainingMs = until.getTime() - nowMs;
  if (remainingMs <= 0) return "Expired";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min remaining`;

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

export function serializeBannedUntil(
  bannedUntil: Date | null | undefined,
): string | null {
  if (!bannedUntil || !isPlayerBanned(bannedUntil)) return null;
  return bannedUntil.toISOString();
}
