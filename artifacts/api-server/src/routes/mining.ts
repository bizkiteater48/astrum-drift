import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { serializePlayer } from "../lib/player";
import { requireAuth } from "../middlewares/auth";
import {
  CYCLE_DURATION_SEC,
  MAX_MINING_QUEUE,
  CREDITS_PER_CYCLE,
  XP_PER_CYCLE,
  xpForLevel,
} from "../lib/constants";

const router: IRouter = Router();

router.post("/mining/start", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;

  const result = await db.transaction(async (tx) => {
    const [player] = await tx
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId))
      .for("update");
    if (!player) {
      return { kind: "missing" as const };
    }
    if (player.miningQueued >= MAX_MINING_QUEUE) {
      return { kind: "full" as const };
    }
    const newQueued = player.miningQueued + 1;
    const startedAt =
      player.miningQueued === 0 ? new Date() : player.miningStartedAt;

    const [updated] = await tx
      .update(playersTable)
      .set({ miningQueued: newQueued, miningStartedAt: startedAt })
      .where(eq(playersTable.id, playerId))
      .returning();
    return { kind: "ok" as const, player: updated! };
  });

  if (result.kind === "missing") {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (result.kind === "full") {
    res.status(409).json({ error: "Mining queue is full" });
    return;
  }
  res.status(200).json({ player: serializePlayer(result.player) });
});

router.post(
  "/mining/collect",
  requireAuth,
  async (req, res): Promise<void> => {
    const playerId = req.session.playerId!;

    const result = await db.transaction(async (tx) => {
      const [player] = await tx
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, playerId))
        .for("update");
      if (!player) {
        return { kind: "missing" as const };
      }
      if (player.miningQueued <= 0 || !player.miningStartedAt) {
        return { kind: "no_cycle" as const };
      }

      const now = Date.now();
      const startedMs = player.miningStartedAt.getTime();
      const elapsedSec = Math.floor((now - startedMs) / 1000);
      const elapsedCycles = Math.floor(elapsedSec / CYCLE_DURATION_SEC);
      const completed = Math.min(elapsedCycles, player.miningQueued);

      if (completed <= 0) {
        return { kind: "not_ready" as const };
      }

      const earnedCredits =
        completed * CREDITS_PER_CYCLE * player.miningLevel;
      const earnedXp = completed * XP_PER_CYCLE * player.miningLevel;

      let newExperience = player.experience + earnedXp;
      let newLevel = player.miningLevel;
      const messages: string[] = [];

      for (let i = 0; i < completed; i++) {
        messages.push(
          `Cycle complete: +${CREDITS_PER_CYCLE * player.miningLevel} credits, +${XP_PER_CYCLE * player.miningLevel} XP.`,
        );
      }

      while (newExperience >= xpForLevel(newLevel)) {
        newExperience -= xpForLevel(newLevel);
        newLevel += 1;
        messages.push(
          `Mining systems calibrated. Level ${newLevel} achieved.`,
        );
      }

      const newCredits = player.credits + earnedCredits;
      const newQueued = player.miningQueued - completed;
      const newStartedAt: Date | null =
        newQueued === 0
          ? null
          : new Date(startedMs + completed * CYCLE_DURATION_SEC * 1000);

      const [updated] = await tx
        .update(playersTable)
        .set({
          credits: newCredits,
          experience: newExperience,
          miningLevel: newLevel,
          miningQueued: newQueued,
          miningStartedAt: newStartedAt,
        })
        .where(eq(playersTable.id, playerId))
        .returning();

      return {
        kind: "ok" as const,
        player: updated!,
        reward: {
          cycles: completed,
          credits: earnedCredits,
          experience: earnedXp,
          leveledUp: newLevel > player.miningLevel,
          newLevel,
          messages,
        },
      };
    });

    if (result.kind === "missing") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (result.kind === "no_cycle") {
      res.status(400).json({ error: "No mining cycles in progress" });
      return;
    }
    if (result.kind === "not_ready") {
      res
        .status(400)
        .json({ error: "Current mining cycle has not finished yet" });
      return;
    }

    res
      .status(200)
      .json({ player: serializePlayer(result.player), reward: result.reward });
  },
);

export default router;
