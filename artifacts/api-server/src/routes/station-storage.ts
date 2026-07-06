import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  applyBalanceMirrors,
  computeBalanceRepair,
  getInventoryFromProgress,
  getStationStorageFromProgress,
  type TutorialProgressBlob,
  withEconomySnapshot,
} from "../lib/player-progress";
import {
  applyStationStorageTransfer,
  isStationStorageLocationId,
  type StationStorageTransferDirection,
} from "../lib/station-storage";

const router: IRouter = Router();

function parseTransferDirection(raw: unknown): StationStorageTransferDirection | null {
  if (raw === "deposit" || raw === "withdraw") return raw;
  return null;
}

router.post(
  "/players/station-storage/transfer",
  requireAuth,
  async (req, res): Promise<void> => {
    const playerId = req.session.playerId!;
    const item = typeof req.body?.item === "string" ? req.body.item.trim() : "";
    const quantityRaw = req.body?.quantity;
    const quantity =
      typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
    const direction = parseTransferDirection(req.body?.direction);
    const locationId =
      typeof req.body?.locationId === "string" ? req.body.locationId.trim() : "";

    if (!item) {
      res.status(400).json({ error: "Item is required." });
      return;
    }

    if (!direction) {
      res.status(400).json({ error: "Direction must be deposit or withdraw." });
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ error: "Quantity must be a positive whole number." });
      return;
    }

    if (!locationId || !isStationStorageLocationId(locationId)) {
      res.status(403).json({
        error: "Station storage is only available at spaceports.",
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
    const stationStorage = getStationStorageFromProgress(progress);

    const transfer = applyStationStorageTransfer(
      personalInventory,
      stationStorage,
      item,
      quantity,
      direction,
    );

    if (!transfer.ok) {
      res.status(400).json({ error: transfer.error });
      return;
    }

    const nextProgressVersion = (currentPlayer.progressVersion ?? 0) + 1;
    const nextProgress: TutorialProgressBlob = {
      ...progress,
      progressVersion: nextProgressVersion,
      tutorialInventory: applyBalanceMirrors(transfer.personalInventory, {
        credits: repair.credits,
        silverCoins: repair.silverCoins,
      }),
      stationStorage: transfer.stationStorage,
    };

    const [updatedPlayer] = await db
      .update(playersTable)
      .set({
        tutorialProgress: nextProgress,
        progressVersion: nextProgressVersion,
      })
      .where(eq(playersTable.id, playerId))
      .returning({
        tutorialProgress: playersTable.tutorialProgress,
        progressVersion: playersTable.progressVersion,
      });

    if (!updatedPlayer) {
      res.status(503).json({ error: "Failed to update station storage." });
      return;
    }

    const savedProgress =
      (updatedPlayer.tutorialProgress as TutorialProgressBlob | null) ?? {};
    const savedInventory = applyBalanceMirrors(
      getInventoryFromProgress(savedProgress),
      {
        credits: repair.credits,
        silverCoins: repair.silverCoins,
      },
    );

    res.status(200).json({
      tutorialInventory: savedInventory,
      stationStorage: getStationStorageFromProgress(savedProgress),
      progressVersion: updatedPlayer.progressVersion ?? nextProgressVersion,
    });
  },
);

export default router;
