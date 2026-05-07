import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, playersTable, userSessionsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { serializePlayer } from "../lib/player";
import { requireAuth, getClientIp } from "../middlewares/auth";

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login or registration attempts. Please try again later.",
  },
});

const IP_UNIQUE_INDEX = "user_sessions_ip_unique";
const IP_CONFLICT_MESSAGE =
  "This network is already in use by another commander.";
const ENFORCE_UNIQUE_IP = process.env.ENFORCE_UNIQUE_IP === "true";
const OPEN_REGISTRATION = process.env.OPEN_REGISTRATION === "true";
const TESTER_ACCESS_CODE = process.env.TESTER_ACCESS_CODE;

function isIpConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
    message?: string;
  };
  if (e.code === "23505" && e.constraint === IP_UNIQUE_INDEX) return true;
  if (e.cause?.code === "23505" && e.cause.constraint === IP_UNIQUE_INDEX) {
    return true;
  }
  return Boolean(e.message?.includes(IP_UNIQUE_INDEX));
}

function isUsernameConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
    message?: string;
  };
  if (e.code === "23505" && e.constraint?.includes("username")) return true;
  if (e.cause?.code === "23505" && e.cause.constraint?.includes("username")) {
    return true;
  }
  return Boolean(e.message?.toLowerCase().includes("username"));
}

function getSubmittedAccessCode(req: import("express").Request): string | null {
  const bodyCode = req.body?.accessCode;

  if (typeof bodyCode === "string") {
    return bodyCode.trim();
  }

  const headerCode = req.header("x-tester-access-code");

  if (typeof headerCode === "string") {
    return headerCode.trim();
  }

  return null;
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

async function claimIpForPlayer(playerId: number, ip: string): Promise<void> {
  await db
    .insert(userSessionsTable)
    .values({ playerId, ip })
    .onConflictDoUpdate({
      target: userSessionsTable.playerId,
      set: { ip, createdAt: new Date() },
    });
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (!OPEN_REGISTRATION) {
    if (!TESTER_ACCESS_CODE) {
      req.log.error(
        "TESTER_ACCESS_CODE is required when OPEN_REGISTRATION is not true",
      );
      res.status(500).json({ error: "Registration is not configured" });
      return;
    }

    const submittedAccessCode = getSubmittedAccessCode(req);

    if (submittedAccessCode !== TESTER_ACCESS_CODE) {
      res.status(403).json({ error: "Invalid tester access code" });
      return;
    }
  }

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
    if (isUsernameConflict(err)) {
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

  try {
    await claimIpForPlayer(player.id, ip);
  } catch (err) {
    if (isIpConflict(err) && ENFORCE_UNIQUE_IP) {
      await destroySession(req);
      await db.delete(playersTable).where(eq(playersTable.id, player.id));
      res.status(403).json({ error: IP_CONFLICT_MESSAGE });
      return;
    }

    req.log.warn({ err }, "Failed to record IP during register");
  }

  res.status(201).json(serializePlayer(player));
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
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

  try {
    await claimIpForPlayer(player.id, ip);
  } catch (err) {
    if (isIpConflict(err) && ENFORCE_UNIQUE_IP) {
      await destroySession(req);
      res.status(403).json({ error: IP_CONFLICT_MESSAGE });
      return;
    }

    req.log.warn({ err }, "Failed to record IP during login");
  }

  res.status(200).json(serializePlayer(player));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const playerId = req.session.playerId;
  if (playerId) {
    try {
      await db
        .delete(userSessionsTable)
        .where(eq(userSessionsTable.playerId, playerId));
    } catch (err) {
      req.log.error({ err }, "Failed to release session lock on logout");
    }
  }
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
      res.status(500).json({ error: "Failed to log out" });
      return;
    }
    res.clearCookie("astrum.sid");
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
