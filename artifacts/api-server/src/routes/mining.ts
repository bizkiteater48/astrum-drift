import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { serializePlayer } from "../lib/player";
import { requireAuth } from "../middlewares/auth";
import {
  CYCLE_DURATION_SEC,
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
    if (player.miningStartedAt) {
      return { kind: "ok" as const, player };
    }
    const [updated] = await tx
      .update(playersTable)
      .set({ miningStartedAt: new Date() })
      .where(eq(playersTable.id, playerId))
      .returning();
    return { kind: "ok" as const, player: updated! };
  });

  if (result.kind === "missing") {
    res.status(401).json({ error: "Not authenticated" });
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
      if (!player.miningStartedAt) {
        return { kind: "no_cycle" as const };
      }

      const now = Date.now();
      const startedMs = player.miningStartedAt.getTime();
      const elapsedSec = Math.floor((now - startedMs) / 1000);

      if (elapsedSec < CYCLE_DURATION_SEC) {
        return { kind: "not_ready" as const };
      }

      const earnedCredits = CREDITS_PER_CYCLE * player.miningLevel;
      const earnedXp = XP_PER_CYCLE * player.miningLevel;

      let newExperience = player.experience + earnedXp;
      let newLevel = player.miningLevel;
      const messages: string[] = [
        `Cycle complete: +${earnedCredits} credits, +${earnedXp} XP.`,
      ];

      while (newExperience >= xpForLevel(newLevel)) {
        newExperience -= xpForLevel(newLevel);
        newLevel += 1;
        messages.push(
          `Mining systems calibrated. Level ${newLevel} achieved.`,
        );
      }

      const [updated] = await tx
        .update(playersTable)
        .set({
          credits: player.credits + earnedCredits,
          experience: newExperience,
          miningLevel: newLevel,
          miningStartedAt: null,
        })
        .where(eq(playersTable.id, playerId))
        .returning();

      return {
        kind: "ok" as const,
        player: updated!,
        reward: {
          cycles: 1,
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
      res.status(400).json({ error: "No mining cycle in progress" });
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
