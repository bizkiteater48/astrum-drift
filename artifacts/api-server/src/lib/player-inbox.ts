import { pool } from "@workspace/db";
import { formatMuteDuration } from "./moderation";
import {
  formatBanDuration,
  isPermanentBanDate,
} from "./player-ban";

export async function sendPlayerInboxMessage(
  playerId: number,
  senderLabel: string,
  subject: string,
  body: string,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO player_inbox_messages (player_id, sender_label, subject, body)
      VALUES ($1, $2, $3, $4)
    `,
    [playerId, senderLabel, subject, body],
  );
}

export function buildAdminGrantInboxBody(
  creditsDelta: number,
  silverCoinsDelta: number,
  items: Record<string, number>,
): string {
  const lines: string[] = ["You have received the following:"];

  if (creditsDelta !== 0) {
    const sign = creditsDelta > 0 ? "+" : "";
    lines.push(`${sign}${creditsDelta.toLocaleString()} Credits`);
  }

  if (silverCoinsDelta !== 0) {
    const sign = silverCoinsDelta > 0 ? "+" : "";
    lines.push(`${sign}${silverCoinsDelta.toLocaleString()} Silver Coins`);
  }

  for (const [itemName, quantity] of Object.entries(items)) {
    lines.push(`${itemName} ×${quantity.toLocaleString()}`);
  }

  return lines.join("\n");
}

export function buildMuteInboxBody(
  durationMinutes: number,
  reason: string,
  details?: string | null,
): string {
  const duration = formatMuteDuration(durationMinutes);
  const reasonLine = details?.trim()
    ? `${reason}: ${details.trim()}`
    : reason;

  return `Your account has been muted for ${duration}.\n\nReason: ${reasonLine}`;
}

export function buildBanInboxBody(
  bannedUntil: Date,
  reason: string,
  durationMinutes: number | "permanent",
): string {
  const durationLabel =
    durationMinutes === "permanent"
      ? "permanent"
      : formatBanDuration(durationMinutes);
  const expiryLine = isPermanentBanDate(bannedUntil)
    ? "This ban does not expire."
    : `Ban expires: ${bannedUntil.toUTCString()}`;

  return `Your account has been banned (${durationLabel}).\n\nReason: ${reason}\n\n${expiryLine}`;
}

export function buildUnbanInboxBody(note?: string | null): string {
  const trimmed = note?.trim();
  if (trimmed) {
    return `Your account ban has been lifted.\n\nNote: ${trimmed}`;
  }
  return "Your account ban has been lifted. You may sign in and play again.";
}

export function buildStaffRoleChangeInboxBody(
  previousRole: string,
  nextRole: string,
): string {
  const previousLabel = formatStaffRoleInboxLabel(previousRole);
  const nextLabel = formatStaffRoleInboxLabel(nextRole);

  if (nextRole === "player") {
    return `Your staff role has been updated from ${previousLabel} to ${nextLabel}.`;
  }

  return `You have been assigned the ${nextLabel} role. Open Settings to configure your chat tag if needed.`;
}

function formatStaffRoleInboxLabel(role: string): string {
  if (role === "mod") return "Moderator";
  if (role === "guide") return "Guide";
  if (role === "admin") return "Admin";
  return "Player";
}
