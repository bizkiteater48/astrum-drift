import { customFetch } from "@workspace/api-client-react";
import type { MainGameLocationId } from "./main-game";

export const STARTER_SHUTTLE_CARGO_SLOT_LIMIT = 25;
export const STARTER_SHUTTLE_NAME = "Starter Shuttle";

export const NON_STORABLE_ITEMS = new Set(["Credits", "Silver Coins"]);

export type ShipCargoTransferDirection = "deposit" | "withdraw";

export type ShipCargoTransferResult = {
  tutorialInventory: Record<string, number>;
  shipCargo: Record<string, number>;
  progressVersion: number;
};

export function getShipCargoStackCount(cargo: Record<string, number>): number {
  return Object.entries(cargo).filter(
    ([key, qty]) => !NON_STORABLE_ITEMS.has(key) && qty > 0,
  ).length;
}

export function listStorableInventoryEntries(
  inventory: Record<string, number>,
  getAvailableQuantity?: (itemName: string) => number,
) {
  return Object.entries(inventory)
    .filter(([itemName, qty]) => {
      if (NON_STORABLE_ITEMS.has(itemName)) return false;
      const available = getAvailableQuantity?.(itemName) ?? qty;
      return available > 0;
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

export function listStoredItemEntries(cargo: Record<string, number>) {
  return Object.entries(cargo)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

export function transferShipCargo(
  item: string,
  quantity: number,
  direction: ShipCargoTransferDirection,
  locationId: MainGameLocationId,
) {
  return customFetch<ShipCargoTransferResult>(
    "/api/players/ship-cargo/transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, quantity, direction, locationId }),
    },
  );
}
