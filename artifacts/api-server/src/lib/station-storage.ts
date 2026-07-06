import {
  getInventoryStackCount,
  wouldExceedInventoryCapacity,
} from "./main-game-inventory";
import { getItemStackLimit } from "./inventory-stack-limits";

export const STATION_STORAGE_SLOT_LIMIT = 100;

export const NON_STORABLE_ITEMS = new Set(["Credits", "Silver Coins"]);

export const STATION_STORAGE_LOCATION_IDS = new Set(["outpost_one_spaceport"]);

export function isStationStorageLocationId(locationId: string): boolean {
  return STATION_STORAGE_LOCATION_IDS.has(locationId);
}

export function getStationStorageStackCount(
  storage: Record<string, number>,
): number {
  return getInventoryStackCount(storage);
}

export function wouldExceedStationStorageCapacity(
  storage: Record<string, number>,
  items: Record<string, number>,
): boolean {
  for (const [item, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    const current = storage[item] ?? 0;
    if (current + qty > getItemStackLimit(item)) return true;
  }

  const newStackCount = Object.entries(items).filter(
    ([item, qty]) => qty > 0 && (storage[item] ?? 0) === 0,
  ).length;

  if (newStackCount === 0) return false;

  return (
    getStationStorageStackCount(storage) + newStackCount >
    STATION_STORAGE_SLOT_LIMIT
  );
}

export type StationStorageTransferDirection = "deposit" | "withdraw";

export type StationStorageTransferResult =
  | {
      ok: true;
      personalInventory: Record<string, number>;
      stationStorage: Record<string, number>;
    }
  | { ok: false; error: string };

export function applyStationStorageTransfer(
  personalInventory: Record<string, number>,
  stationStorage: Record<string, number>,
  item: string,
  quantity: number,
  direction: StationStorageTransferDirection,
): StationStorageTransferResult {
  const trimmedItem = item.trim();
  if (!trimmedItem) {
    return { ok: false, error: "Item is required." };
  }

  if (NON_STORABLE_ITEMS.has(trimmedItem)) {
    return { ok: false, error: "Credits and silver coins cannot be stored." };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a positive whole number." };
  }

  if (direction === "deposit") {
    const available = personalInventory[trimmedItem] ?? 0;
    if (available < quantity) {
      return { ok: false, error: "Not enough items in your inventory." };
    }

    if (
      wouldExceedStationStorageCapacity(stationStorage, {
        [trimmedItem]: quantity,
      })
    ) {
      return { ok: false, error: "Station storage is full or stack limit reached." };
    }

    const nextPersonal = { ...personalInventory };
    const remaining = available - quantity;
    if (remaining > 0) nextPersonal[trimmedItem] = remaining;
    else delete nextPersonal[trimmedItem];

    const nextStorage = { ...stationStorage };
    nextStorage[trimmedItem] = (nextStorage[trimmedItem] ?? 0) + quantity;

    return {
      ok: true,
      personalInventory: nextPersonal,
      stationStorage: nextStorage,
    };
  }

  const stored = stationStorage[trimmedItem] ?? 0;
  if (stored < quantity) {
    return { ok: false, error: "Not enough items in station storage." };
  }

  if (
    wouldExceedInventoryCapacity(personalInventory, {
      [trimmedItem]: quantity,
    })
  ) {
    return {
      ok: false,
      error: "Personal inventory is full or stack limit reached.",
    };
  }

  const nextStorage = { ...stationStorage };
  const remainingStored = stored - quantity;
  if (remainingStored > 0) nextStorage[trimmedItem] = remainingStored;
  else delete nextStorage[trimmedItem];

  const nextPersonal = { ...personalInventory };
  nextPersonal[trimmedItem] = (nextPersonal[trimmedItem] ?? 0) + quantity;

  return {
    ok: true,
    personalInventory: nextPersonal,
    stationStorage: nextStorage,
  };
}
