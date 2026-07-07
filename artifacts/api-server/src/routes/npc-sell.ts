import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  applyNpcSell,
  getEquippedItemCounts,
} from "../lib/npc-economy";
import { isNpcExchangeLocationId } from "../lib/npc-exchange";
import {
  applyBalanceMirrors,
  computeBalanceRepair,
  getInventoryFromProgress,
  type TutorialProgressBlob,
} from "../lib/player-progress";

const router: IRouter = Router();

router.post("/players/npc-sell", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;
  const item = typeof req.body?.item === "string" ? req.body.item.trim() : "";
  const quantityRaw = req.body?.quantity;
  const quantity =
    typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
  const locationId =
    typeof req.body?.locationId === "string" ? req.body.locationId.trim() : "";

  if (!item) {
    res.status(400).json({ error: "Item is required." });
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    res.status(400).json({ error: "Quantity must be a positive whole number." });
    return;
  }

  if (!locationId || !isNpcExchangeLocationId(locationId)) {
    res.status(403).json({
      error: "NPC vendor exchange is only available at spaceports.",
    });
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
  const progress = repair.tutorialProgress;
  const personalInventory = applyBalanceMirrors(getInventoryFromProgress(progress), {
    credits: repair.credits,
    silverCoins: repair.silverCoins,
  });
  const equippedCounts = getEquippedItemCounts(progress.equippedGear);

  const sell = applyNpcSell(personalInventory, item, quantity, equippedCounts);

  if (!sell.ok) {
    res.status(400).json({ error: sell.error });
    return;
  }

  const nextCredits = repair.credits + sell.creditsEarned;
  const nextProgressVersion = (currentPlayer.progressVersion ?? 0) + 1;
  const nextProgress: TutorialProgressBlob = {
    ...progress,
    progressVersion: nextProgressVersion,
    tutorialInventory: applyBalanceMirrors(sell.inventory, {
      credits: nextCredits,
      silverCoins: repair.silverCoins,
    }),
  };

  const [updatedPlayer] = await db
    .update(playersTable)
    .set({
      credits: nextCredits,
      tutorialProgress: nextProgress,
      progressVersion: nextProgressVersion,
    })
    .where(eq(playersTable.id, playerId))
    .returning({
      credits: playersTable.credits,
      silverCoins: playersTable.silverCoins,
      tutorialProgress: playersTable.tutorialProgress,
      progressVersion: playersTable.progressVersion,
    });

  if (!updatedPlayer) {
    res.status(503).json({ error: "Failed to complete NPC sell." });
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
    tutorialInventory: savedInventory,
    creditsEarned: sell.creditsEarned,
    quantitySold: sell.quantitySold,
    item,
    progressVersion: updatedPlayer.progressVersion ?? nextProgressVersion,
  });
});

export default router;
