import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  applyMainGameActionInventory,
  getActionSkillXp,
  getEquippedHandItem,
  getRequiredHandItem,
  isActionAllowedAtLocation,
  parseMainGameActionId,
  readSkillXpFromProgress,
} from "../lib/main-game-actions";
import {
  applyBalanceMirrors,
  computeBalanceRepair,
  getInventoryFromProgress,
  type TutorialProgressBlob,
} from "../lib/player-progress";

const router: IRouter = Router();

router.post(
  "/players/main-game/actions/complete",
  requireAuth,
  async (req, res): Promise<void> => {
    const playerId = req.session.playerId!;
    const actionId = parseMainGameActionId(req.body?.actionId);
    const locationId =
      typeof req.body?.locationId === "string" ? req.body.locationId.trim() : "";

    if (!actionId) {
      res.status(400).json({ error: "Invalid action id." });
      return;
    }

    if (!locationId) {
      res.status(400).json({ error: "Location id is required." });
      return;
    }

    if (!isActionAllowedAtLocation(actionId, locationId)) {
      res.status(403).json({ error: "Action is not available at this location." });
      return;
    }

    const [currentPlayer] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!currentPlayer) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const repair = computeBalanceRepair(currentPlayer);
    const progress: TutorialProgressBlob = { ...repair.tutorialProgress };
    const equippedHand = getEquippedHandItem(progress.equippedGear);
    const requiredHand = getRequiredHandItem(actionId);

    if (requiredHand && equippedHand !== requiredHand) {
      res.status(400).json({
        error: `Equip ${requiredHand} before running this action.`,
      });
      return;
    }

    const personalInventory = applyBalanceMirrors(getInventoryFromProgress(progress), {
      credits: repair.credits,
      silverCoins: repair.silverCoins,
    });

    const inventoryResult = applyMainGameActionInventory(actionId, personalInventory);

    if (inventoryResult === null) {
      if (actionId === "fabricate_bronze_bar" || actionId === "fabricate_iron_bar" || actionId === "fabricate_silver_coins") {
        res.status(400).json({ error: "Insufficient materials for fabrication." });
        return;
      }

      res.status(400).json({ error: "Inventory full. Cannot collect more items." });
      return;
    }

    let nextCredits = repair.credits;
    let nextSilverCoins = repair.silverCoins;

    if (actionId === "fabricate_silver_coins") {
      nextSilverCoins += 1;
    }

    const skillXp = readSkillXpFromProgress(progress);
    const award = getActionSkillXp(actionId);
    if (award) {
      skillXp[award.skill] = (skillXp[award.skill] ?? 0) + award.xp;
    }

    const nextProgressVersion = (currentPlayer.progressVersion ?? 0) + 1;
    const nextProgress: TutorialProgressBlob = {
      ...progress,
      progressVersion: nextProgressVersion,
      skillXp,
      tutorialInventory: applyBalanceMirrors(inventoryResult, {
        credits: nextCredits,
        silverCoins: nextSilverCoins,
      }),
    };

    const [updatedPlayer] = await db
      .update(playersTable)
      .set({
        credits: nextCredits,
        silverCoins: nextSilverCoins,
        progressVersion: nextProgressVersion,
        tutorialProgress: nextProgress,
      })
      .where(eq(playersTable.id, playerId))
      .returning({
        tutorialProgress: playersTable.tutorialProgress,
        progressVersion: playersTable.progressVersion,
        silverCoins: playersTable.silverCoins,
        credits: playersTable.credits,
      });

    if (!updatedPlayer) {
      res.status(503).json({ error: "Failed to complete action." });
      return;
    }

    const savedProgress =
      (updatedPlayer.tutorialProgress as TutorialProgressBlob | null) ?? {};
    const savedInventory = applyBalanceMirrors(
      getInventoryFromProgress(savedProgress),
      {
        credits: updatedPlayer.credits,
        silverCoins: updatedPlayer.silverCoins ?? 0,
      },
    );

    res.status(200).json({
      actionId,
      tutorialInventory: savedInventory,
      skillXp: readSkillXpFromProgress(savedProgress),
      progressVersion: updatedPlayer.progressVersion ?? nextProgressVersion,
      silverCoins: updatedPlayer.silverCoins ?? 0,
      credits: updatedPlayer.credits,
    });
  },
);

export default router;
