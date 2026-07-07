import {
  getInventoryStackCount,
  wouldExceedInventoryCapacity,
} from "./main-game-inventory";
import { getItemStackLimit } from "./inventory-stack-limits";

export const STARTER_SHUTTLE_CARGO_SLOT_LIMIT = 25;

export const NON_STORABLE_ITEMS = new Set(["Credits", "Silver Coins"]);

/** Spaceports and planet landing sites where the active ship is docked. */
export const SHIP_CARGO_LOCATION_IDS = new Set([
  "outpost_one_spaceport",
  "aurelia_gate",
  "mirehaven",
  "scrapreach_port",
  "tidecrest",
  "crownfall",
]);

export function isShipCargoLocationId(locationId: string): boolean {
  return SHIP_CARGO_LOCATION_IDS.has(locationId);
}

export function getShipCargoStackCount(cargo: Record<string, number>): number {
  return getInventoryStackCount(cargo);
}

export function wouldExceedShipCargoCapacity(
  cargo: Record<string, number>,
  items: Record<string, number>,
): boolean {
  for (const [item, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    const current = cargo[item] ?? 0;
    if (current + qty > getItemStackLimit(item)) return true;
  }

  const newStackCount = Object.entries(items).filter(
    ([item, qty]) => qty > 0 && (cargo[item] ?? 0) === 0,
  ).length;

  if (newStackCount === 0) return false;

  return (
    getShipCargoStackCount(cargo) + newStackCount > STARTER_SHUTTLE_CARGO_SLOT_LIMIT
  );
}

export type ShipCargoTransferDirection = "deposit" | "withdraw";

export type ShipCargoTransferResult =
  | {
      ok: true;
      personalInventory: Record<string, number>;
      shipCargo: Record<string, number>;
    }
  | { ok: false; error: string };

export function applyShipCargoTransfer(
  personalInventory: Record<string, number>,
  shipCargo: Record<string, number>,
  item: string,
  quantity: number,
  direction: ShipCargoTransferDirection,
): ShipCargoTransferResult {
  const trimmedItem = item.trim();
  if (!trimmedItem) {
    return { ok: false, error: "Item is required." };
  }

  if (NON_STORABLE_ITEMS.has(trimmedItem)) {
    return { ok: false, error: "Credits and silver coins cannot be stored in ship cargo." };
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
      wouldExceedShipCargoCapacity(shipCargo, {
        [trimmedItem]: quantity,
      })
    ) {
      return { ok: false, error: "Ship cargo is full or stack limit reached." };
    }

    const nextPersonal = { ...personalInventory };
    const remaining = available - quantity;
    if (remaining > 0) nextPersonal[trimmedItem] = remaining;
    else delete nextPersonal[trimmedItem];

    const nextCargo = { ...shipCargo };
    nextCargo[trimmedItem] = (nextCargo[trimmedItem] ?? 0) + quantity;

    return {
      ok: true,
      personalInventory: nextPersonal,
      shipCargo: nextCargo,
    };
  }

  const stored = shipCargo[trimmedItem] ?? 0;
  if (stored < quantity) {
    return { ok: false, error: "Not enough items in ship cargo." };
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

  const nextCargo = { ...shipCargo };
  const remainingStored = stored - quantity;
  if (remainingStored > 0) nextCargo[trimmedItem] = remainingStored;
  else delete nextCargo[trimmedItem];

  const nextPersonal = { ...personalInventory };
  nextPersonal[trimmedItem] = (nextPersonal[trimmedItem] ?? 0) + quantity;

  return {
    ok: true,
    personalInventory: nextPersonal,
    shipCargo: nextCargo,
  };
}
