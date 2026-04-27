import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { serializePlayer } from "../lib/player";
import { requireAuth, getClientIp } from "../middlewares/auth";

const router: IRouter = Router();

const ACTIVE_IP_UNIQUE_INDEX = "players_active_ip_unique";
const IP_CONFLICT_MESSAGE =
  "This network is already in use by another commander.";

function isActiveIpConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
    message?: string;
  };
  if (e.code === "23505" && e.constraint === ACTIVE_IP_UNIQUE_INDEX) {
    return true;
  }
  if (
    e.cause?.code === "23505" &&
    e.cause.constraint === ACTIVE_IP_UNIQUE_INDEX
  ) {
    return true;
  }
  return Boolean(e.message?.includes(ACTIVE_IP_UNIQUE_INDEX));
}

function saveSession(req: import("express").Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req: import("express").Request): Promise<void> {
  return new Promise((resolve) => {
    req.session.destroy(() => resolve());
  });
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const ip = getClientIp(req);
  const hashedPassword = await bcrypt.hash(password, 10);

  let player;
  try {
    const inserted = await db
      .insert(playersTable)
      .values({ username, hashedPassword })
      .returning();
    player = inserted[0];
  } catch (err: unknown) {
    const e = err as { code?: string; constraint?: string };
    if (e.code === "23505" && e.constraint?.includes("username")) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    req.log.error({ err }, "Failed to create player");
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  if (!player) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  req.session.playerId = player.id;
  try {
    await saveSession(req);
  } catch (err) {
    req.log.error({ err }, "Failed to save session during register");
    await db.delete(playersTable).where(eq(playersTable.id, player.id));
    res.status(500).json({ error: "Failed to save session" });
    return;
  }

  let claimed;
  try {
    const updated = await db
      .update(playersTable)
      .set({ activeIp: ip })
      .where(eq(playersTable.id, player.id))
      .returning();
    claimed = updated[0];
  } catch (err) {
    if (isActiveIpConflict(err)) {
      await destroySession(req);
      await db.delete(playersTable).where(eq(playersTable.id, player.id));
      res.status(403).json({ error: IP_CONFLICT_MESSAGE });
      return;
    }
    req.log.error({ err }, "Failed to claim IP during register");
    await destroySession(req);
    await db.delete(playersTable).where(eq(playersTable.id, player.id));
    res.status(500).json({ error: "Failed to register" });
    return;
  }

  if (!claimed) {
    res.status(500).json({ error: "Failed to register" });
    return;
  }

  res.status(201).json(serializePlayer(claimed));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const ip = getClientIp(req);

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.username, username));

  if (!player) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const ok = await bcrypt.compare(password, player.hashedPassword);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.playerId = player.id;
  try {
    await saveSession(req);
  } catch (err) {
    req.log.error({ err }, "Failed to save session during login");
    res.status(500).json({ error: "Failed to save session" });
    return;
  }

  let claimed;
  try {
    const updated = await db
      .update(playersTable)
      .set({ activeIp: ip })
      .where(eq(playersTable.id, player.id))
      .returning();
    claimed = updated[0];
  } catch (err) {
    if (isActiveIpConflict(err)) {
      await destroySession(req);
      res.status(403).json({ error: IP_CONFLICT_MESSAGE });
      return;
    }
    req.log.error({ err }, "Failed to claim IP during login");
    await destroySession(req);
    res.status(500).json({ error: "Failed to log in" });
    return;
  }

  if (!claimed) {
    res.status(500).json({ error: "Failed to log in" });
    return;
  }

  res.status(200).json(serializePlayer(claimed));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const playerId = req.session.playerId;
  if (playerId) {
    try {
      await db
        .update(playersTable)
        .set({ activeIp: null })
        .where(eq(playersTable.id, playerId));
    } catch (err) {
      req.log.error({ err }, "Failed to clear active IP on logout");
    }
  }
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
      res.status(500).json({ error: "Failed to log out" });
      return;
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ success: true });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;
  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, playerId));
  if (!player) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.status(200).json(serializePlayer(player));
});

export default router;
