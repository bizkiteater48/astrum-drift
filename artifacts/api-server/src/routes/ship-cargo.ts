import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  applyBalanceMirrors,
  computeBalanceRepair,
  getInventoryFromProgress,
  getShipCargoFromProgress,
  type TutorialProgressBlob,
} from "../lib/player-progress";
import {
  applyShipCargoTransfer,
  isShipCargoLocationId,
  type ShipCargoTransferDirection,
} from "../lib/ship-cargo";

const router: IRouter = Router();

function parseTransferDirection(raw: unknown): ShipCargoTransferDirection | null {
  if (raw === "deposit" || raw === "withdraw") return raw;
  return null;
}

router.post(
  "/players/ship-cargo/transfer",
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

    if (!locationId || !isShipCargoLocationId(locationId)) {
      res.status(403).json({
        error: "Ship cargo is only available at spaceports and landing sites.",
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
    const shipCargo = getShipCargoFromProgress(progress);

    const transfer = applyShipCargoTransfer(
      personalInventory,
      shipCargo,
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
      shipCargo: transfer.shipCargo,
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
      res.status(503).json({ error: "Failed to update ship cargo." });
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
      shipCargo: getShipCargoFromProgress(savedProgress),
      progressVersion: updatedPlayer.progressVersion ?? nextProgressVersion,
    });
  },
);

export default router;
