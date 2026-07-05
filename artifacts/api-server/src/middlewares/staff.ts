import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { isStaffRole, type PlayerRole } from "../lib/moderation";

declare module "express-serve-static-core" {
  interface Request {
    staffRole?: PlayerRole;
  }
}

async function loadStaffRole(req: Request): Promise<PlayerRole | null> {
  const playerId = req.session.playerId;
  if (!playerId) return null;

  const [player] = await db
    .select({ role: playersTable.role })
    .from(playersTable)
    .where(eq(playersTable.id, playerId));

  if (!player?.role) return null;
  return player.role as PlayerRole;
}

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.session.playerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const role = await loadStaffRole(req);
  if (!role || !isStaffRole(role)) {
    res.status(403).json({ error: "Staff access required" });
    return;
  }

  req.staffRole = role;
  next();
}
