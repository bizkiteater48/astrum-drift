import { customFetch } from "@workspace/api-client-react";
import type { MainGameLocationId } from "./main-game";

export const STATION_STORAGE_SLOT_LIMIT = 100;

export const NON_STORABLE_ITEMS = new Set(["Credits", "Silver Coins"]);

export type StationStorageTransferDirection = "deposit" | "withdraw";

export type StationStorageTransferResult = {
  tutorialInventory: Record<string, number>;
  stationStorage: Record<string, number>;
  progressVersion: number;
};

export function getStationStorageStackCount(
  storage: Record<string, number>,
): number {
  return Object.entries(storage).filter(
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

export function listStoredItemEntries(storage: Record<string, number>) {
  return Object.entries(storage)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

export function transferStationStorage(
  item: string,
  quantity: number,
  direction: StationStorageTransferDirection,
  locationId: MainGameLocationId,
) {
  return customFetch<StationStorageTransferResult>(
    "/api/players/station-storage/transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, quantity, direction, locationId }),
    },
  );
}
