import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import {
  formatBanTimeRemaining,
  isPermanentBanDate,
  isPlayerBanned,
} from "../lib/player-ban";

export async function rejectIfPlayerBanned(
  playerId: number,
  res: Response,
): Promise<boolean> {
  const [player] = await db
    .select({
      bannedUntil: playersTable.bannedUntil,
      banReason: playersTable.banReason,
    })
    .from(playersTable)
    .where(eq(playersTable.id, playerId));

  if (!player || !isPlayerBanned(player.bannedUntil)) {
    return false;
  }

  const bannedUntil = player.bannedUntil!;
  const remaining = formatBanTimeRemaining(bannedUntil);
  const reason = player.banReason?.trim() || "Account banned";

  res.status(403).json({
    error: isPermanentBanDate(bannedUntil)
      ? `Account permanently banned. Reason: ${reason}`
      : `Account banned (${remaining}). Reason: ${reason}`,
    bannedUntil: bannedUntil.toISOString(),
    banReason: reason,
  });

  return true;
}

export async function requireNotBanned(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const playerId = req.session.playerId;
  if (!playerId) {
    next();
    return;
  }

  const blocked = await rejectIfPlayerBanned(playerId, res);
  if (!blocked) {
    next();
  }
}
