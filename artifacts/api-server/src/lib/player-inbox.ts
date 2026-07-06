import { pool } from "@workspace/db";
import { formatMuteDuration } from "./moderation";

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
