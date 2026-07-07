/** From Astrum_Drift_NPC_Economy_READY_Baseline.xlsx — Material Values (NPC Buy Floor). */
const NPC_BUY_FLOOR_PRICES: Record<string, number> = {
  "Copper Ore": 1,
  "Tin Ore": 1,
  "Iron Ore": 2,
  Coal: 2,
  "Silver Ore": 5,
  "Nickel Ore": 8,
  Quartz: 12,
  "Titanium Ore": 18,
  "Tungsten Ore": 30,
  "Cobalt Ore": 40,
  "Platinum Ore": 65,
  "Iridium Ore": 100,
  "Palladium Ore": 140,
  "Obsidian Shard": 200,
  "Meteoric Ore": 275,
  "Void Ore": 400,
  "Scrap Metal": 1,
  "Wire Bundle": 2,
  "Armor Plating": 4,
  "Circuit Board": 5,
  "Sensor Parts": 8,
  "Power Cell": 15,
  "Servo Motor": 25,
  "Tech Core": 75,
  "Ancient Tech Core": 350,
  Fiberleaf: 1,
  "Spore Pod": 1,
  "Medicinal Sap": 3,
  "Resin Bloom": 5,
  "Glowcap Fungus": 8,
  "Venom Gland": 12,
  "Bio-Crystal": 25,
  "Mutagen Root": 65,
  "Ancient Seed Core": 350,
  "Bronze Bar": 2,
  "Iron Bar": 3,
  "Steel Bar": 6,
  "Nickel Bar": 16,
  "Titanium Bar": 37,
  "Tungsten Bar": 64,
  "Cobalt Bar": 121,
  "Platinum Bar": 168,
  "Iridium Bar": 300,
  "Palladium Bar": 451,
  "Meteoric Bar": 970,
  "Void Bar": 1577,
  "Clouded Garnet": 2500,
  "Pale Sapphire": 3500,
  "Bright Emerald": 5000,
  "Ember Ruby": 7500,
  "Star Opal": 10000,
  "Azure Topaz": 12500,
  "Royal Amethyst": 17500,
  "Astral Diamond": 25000,
  "Luminous Pearl": 35000,
  "Shadow Onyx": 45000,
  "Celestial Prism": 60000,
  "Void Pearl": 100000,
};

const NPC_ITEM_ALIASES: Record<string, string> = {
  Circuit: "Circuit Board",
};

export const NON_NPC_SELLABLE_ITEMS = new Set(["Credits", "Silver Coins"]);

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

export type NpcSellResult =
  | {
      ok: true;
      inventory: Record<string, number>;
      creditsEarned: number;
      quantitySold: number;
    }
  | { ok: false; error: string };

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
