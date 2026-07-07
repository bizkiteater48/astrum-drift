import { NPC_BUY_FLOOR_PRICES } from "./npc-economy-prices";

export const MINOR_MED_GEL_ITEM = "Minor Med Gel";
const LEGACY_LIFE_SUPPORT_GEL_ITEM = "Life Support Gel";

/** In-game inventory names mapped to economy workbook item names. */
const NPC_ITEM_ALIASES: Record<string, string> = {
  Circuit: "Circuit Board",
  [LEGACY_LIFE_SUPPORT_GEL_ITEM]: MINOR_MED_GEL_ITEM,
};

export const NON_NPC_SELLABLE_ITEMS = new Set(["Credits", "Silver Coins", "Silver Coin"]);

export type NpcSellResult =
  | {
      ok: true;
      inventory: Record<string, number>;
      creditsEarned: number;
      quantitySold: number;
    }
  | { ok: false; error: string };

function resolveEconomyItemName(itemName: string): string {
  return NPC_ITEM_ALIASES[itemName] ?? itemName;
}

export function getNpcBuyPrice(itemName: string): number | null {
  if (NON_NPC_SELLABLE_ITEMS.has(itemName)) return null;

  const economyName = resolveEconomyItemName(itemName);
  const price = NPC_BUY_FLOOR_PRICES[economyName];
  if (price === undefined || price <= 0) return null;
  return price;
}

export function applyNpcSell(
  inventory: Record<string, number>,
  itemName: string,
  quantity: number,
  equippedCounts: Record<string, number> = {},
): NpcSellResult {
  const unitPrice = getNpcBuyPrice(itemName);
  if (unitPrice === null) {
    return { ok: false, error: `${itemName} is not accepted by the vendor.` };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a positive whole number." };
  }

  const owned = inventory[itemName] ?? 0;
  const equipped = equippedCounts[itemName] ?? 0;
  const available = Math.max(0, owned - equipped);

  if (available < quantity) {
    return {
      ok: false,
      error: `Only ${available} ${itemName} available to sell (equipped items cannot be sold).`,
    };
  }

  const creditsEarned = unitPrice * quantity;
  const next = { ...inventory };
  const remaining = owned - quantity;

  if (remaining > 0) next[itemName] = remaining;
  else delete next[itemName];

  return {
    ok: true,
    inventory: next,
    creditsEarned,
    quantitySold: quantity,
  };
}

export function getEquippedItemCounts(equippedGear: unknown): Record<string, number> {
  const counts: Record<string, number> = {};

  if (
    !equippedGear ||
    typeof equippedGear !== "object" ||
    Array.isArray(equippedGear)
  ) {
    return counts;
  }

  for (const value of Object.values(equippedGear as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }

  return counts;
}

export function migrateLegacyInventoryItemNames(
  inventory: Record<string, number>,
): Record<string, number> {
  const legacyGel = inventory[LEGACY_LIFE_SUPPORT_GEL_ITEM] ?? 0;
  if (legacyGel <= 0) return inventory;

  const next = { ...inventory };
  next[MINOR_MED_GEL_ITEM] = (next[MINOR_MED_GEL_ITEM] ?? 0) + legacyGel;
  delete next[LEGACY_LIFE_SUPPORT_GEL_ITEM];
  return next;
}
