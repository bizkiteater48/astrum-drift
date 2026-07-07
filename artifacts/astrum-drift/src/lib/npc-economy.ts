import { NPC_BUY_FLOOR_PRICES } from "./npc-economy-prices";

export const MINOR_MED_GEL_ITEM = "Minor Med Gel";

/** In-game inventory names mapped to economy workbook item names. */
const NPC_ITEM_ALIASES: Record<string, string> = {
  Circuit: "Circuit Board",
  "Life Support Gel": MINOR_MED_GEL_ITEM,
};

export type NpcExchangeListing = {
  itemName: string;
  economyName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function resolveEconomyItemName(itemName: string): string {
  return NPC_ITEM_ALIASES[itemName] ?? itemName;
}

export function getNpcBuyPrice(itemName: string): number | null {
  if (itemName === "Credits" || itemName === "Silver Coins" || itemName === "Silver Coin") {
    return null;
  }

  const economyName = resolveEconomyItemName(itemName);
  const price = NPC_BUY_FLOOR_PRICES[economyName];
  if (price === undefined || price <= 0) return null;
  return price;
}

export function listNpcExchangeListings(
  inventory: Record<string, number>,
  getAvailableQuantity: (itemName: string) => number,
): NpcExchangeListing[] {
  const listings: NpcExchangeListing[] = [];

  for (const [itemName] of Object.entries(inventory)) {
    if (itemName === "Credits") continue;

    const unitPrice = getNpcBuyPrice(itemName);
    if (unitPrice === null) continue;

    const quantity = getAvailableQuantity(itemName);
    if (quantity <= 0) continue;

    listings.push({
      itemName,
      economyName: resolveEconomyItemName(itemName),
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    });
  }

  return listings.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export function applyNpcSell(
  inventory: Record<string, number>,
  itemName: string,
  quantity: number,
): { inventory: Record<string, number>; creditsEarned: number } | null {
  const unitPrice = getNpcBuyPrice(itemName);
  if (unitPrice === null || quantity <= 0) return null;

  const owned = inventory[itemName] ?? 0;
  if (owned < quantity) return null;

  const creditsEarned = unitPrice * quantity;
  const next = { ...inventory };
  const remaining = owned - quantity;

  if (remaining > 0) next[itemName] = remaining;
  else delete next[itemName];

  next.Credits = (next.Credits ?? 0) + creditsEarned;
  return { inventory: next, creditsEarned };
}

export function migrateLegacyInventoryItemNames(
  inventory: Record<string, number>,
): Record<string, number> {
  const legacyGel = inventory["Life Support Gel"] ?? 0;
  if (legacyGel <= 0) return inventory;

  const next = { ...inventory };
  next[MINOR_MED_GEL_ITEM] = (next[MINOR_MED_GEL_ITEM] ?? 0) + legacyGel;
  delete next["Life Support Gel"];
  return next;
}
