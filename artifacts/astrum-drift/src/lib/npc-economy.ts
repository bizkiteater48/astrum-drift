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

/** In-game inventory names mapped to economy workbook item names. */
const NPC_ITEM_ALIASES: Record<string, string> = {
  Circuit: "Circuit Board",
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
