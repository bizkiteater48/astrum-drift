import type { CodexEntry } from "./types";

const HARVEST_SOURCE =
  "Astrum_Drift_Harvesting_Synthesis_Master_READY_Balance_Update.xlsx";
const FAB_SOURCE = "Astrum_Drift_Mining_Fabrication_Final.xlsx";
const ENG_SOURCE =
  "Astrum_Drift_Engineering_Salvaging_Master_READY_Vehicle_Repair.xlsx";
const HANDOFF = "Astrum_Drift_AI_Handoff_Full_Project_Brief.md";

const TUTORIAL_MATERIALS: CodexEntry[] = [
  {
    id: "iron-ore-tutorial",
    category: "materials",
    name: "Iron Ore",
    subtitle: "Tutorial · Raw Ore",
    description: "Unrefined iron extracted during Industrial Yard training.",
    tags: ["ore", "tutorial", "mining"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
    codeNote: "Same name as field Iron Ore; tutorial context only in codex.",
  },
  {
    id: "refined-iron",
    category: "materials",
    name: "Refined Iron",
    subtitle: "Tutorial · Processed Metal",
    description:
      "Smelted iron stock used to fabricate the Training Blade and other training equipment.",
    tags: ["bar", "tutorial", "fabrication"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
  },
  {
    id: "bio-fiber",
    category: "materials",
    name: "Bio Fiber",
    subtitle: "Tutorial · Harvest",
    description: "Organic fiber harvested in the Bio Dome for synthesis recipes.",
    tags: ["harvest", "tutorial", "bio"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
  },
  {
    id: "basic-chemical",
    category: "materials",
    name: "Basic Chemical",
    subtitle: "Tutorial · Reagent",
    description:
      "Stabilized chemical reagent paired with Bio Fiber for gel synthesis.",
    tags: ["reagent", "tutorial", "synthesis"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
  },
  {
    id: "life-support-gel",
    category: "materials",
    name: "Life Support Gel",
    subtitle: "Tutorial · Consumable",
    description:
      "Medical gel that restores health after combat. Required to complete post-drone recovery during training.",
    tags: ["consumable", "tutorial", "medical"],
    materialGroup: "Tutorial",
    stats: { Heal: "Tutorial recovery" },
    sourceDoc: "main-game.ts",
    codeNote: "Tutorial name; design ladder uses Micro Med Gel through Recovery Gel.",
  },
  {
    id: "damaged-scrap",
    category: "materials",
    name: "Damaged Scrap",
    subtitle: "Tutorial · Salvage",
    description:
      "Low-grade scrap dropped by the Training Drone. Sold at the Outpost Shop for credits.",
    tags: ["salvage", "tutorial", "vendor"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
  },
  {
    id: "salvage-parts",
    category: "materials",
    name: "Salvage Parts",
    subtitle: "Tutorial · Salvage",
    description:
      "Recovered components from the Wreck Site. Consumed when repairing the Training Rover.",
    tags: ["salvage", "tutorial", "engineering"],
    materialGroup: "Tutorial",
    sourceDoc: "main-game.ts",
  },
];

type MaterialDef = {
  name: string;
  group: string;
  description: string;
  tags: string[];
  stats?: Record<string, string | number>;
  recipe?: string;
  drops?: string;
  sourceDoc?: string;
  codeNote?: string;
};

const ORE_MATERIALS: MaterialDef[] = [
  { name: "Copper Ore", group: "Ores", description: "Early ore from Copper Vein sites. Combined with Tin Ore for bronze fabrication.", tags: ["ore", "mining", "tier-1"], stats: { "Mining Level": 1, "Stack Limit": 1000 } },
  { name: "Tin Ore", group: "Ores", description: "Early support ore for bronze bar recipes.", tags: ["ore", "mining", "tier-1"], stats: { "Mining Level": 5, "Stack Limit": 1000 } },
  { name: "Iron Ore", group: "Ores", description: "Industrial iron ore for iron and steel bar production.", tags: ["ore", "mining", "tier-1"], stats: { "Mining Level": 10, "Stack Limit": 1000 }, codeNote: "Field ore; distinct from tutorial-context entry." },
  { name: "Coal", group: "Ores", description: "Fuel ore required for steel and higher bar recipes.", tags: ["ore", "mining", "support"], stats: { "Mining Level": 15, "Stack Limit": 1000 } },
  { name: "Silver Ore", group: "Ores", description: "Precious ore mined at Silver Vein. Can drop Clouded Garnet.", tags: ["ore", "mining", "precious"], stats: { "Mining Level": 20, "Rare Gem": "Clouded Garnet (0.02%)" } },
  { name: "Silver Coin", group: "Currency", description: "Minted from silver ore at 1:1. Used for Drift Lounge gambling.", tags: ["currency", "gambling"], stats: { "Mint Cost": "1 Silver Ore" } },
  { name: "Nickel Ore", group: "Ores", description: "Mid-tier ore for nickel gear and bars.", tags: ["ore", "mining", "tier-2"], stats: { "Mining Level": 25, "Rare Gem": "Pale Sapphire" } },
  { name: "Quartz", group: "Ores", description: "Crystal support material for cobalt-tier fabrication and storage upgrades.", tags: ["ore", "mining", "support"], stats: { "Mining Level": 30 } },
  { name: "Titanium Ore", group: "Ores", description: "Advanced structural ore for mid-high tier bars.", tags: ["ore", "mining", "tier-3"], stats: { "Mining Level": 40, "Rare Gem": "Ember Ruby (0.015%)" } },
  { name: "Tungsten Ore", group: "Ores", description: "Dense ore for hardened equipment bands.", tags: ["ore", "mining", "tier-3"], stats: { "Mining Level": 50, "Rare Gem": "Star Opal" } },
  { name: "Cobalt Ore", group: "Ores", description: "High-tier ore introducing quartz in bar recipes.", tags: ["ore", "mining", "tier-4"], stats: { "Mining Level": 60, "Rare Gem": "Azure Topaz" } },
  { name: "Platinum Ore", group: "Ores", description: "Precious industrial ore for platinum gear.", tags: ["ore", "mining", "tier-4"], stats: { "Mining Level": 75, "Rare Gem": "Royal Amethyst (0.01%)" } },
  { name: "Iridium Ore", group: "Ores", description: "Rare ore for iridium bar and equipment progression.", tags: ["ore", "mining", "tier-5"], stats: { "Mining Level": 90, "Rare Gem": "Astral Diamond" } },
  { name: "Palladium Ore", group: "Ores", description: "Late-game ore feeding palladium fabrication.", tags: ["ore", "mining", "tier-5"], stats: { "Mining Level": 105, "Rare Gem": "Luminous Pearl (0.0075%)" } },
  { name: "Obsidian Shard", group: "Ores", description: "Volcanic glass shard for meteoric and void gear.", tags: ["ore", "mining", "endgame"], stats: { "Mining Level": 120, "Rare Gem": "Shadow Onyx" } },
  { name: "Meteoric Ore", group: "Ores", description: "Exotic ore from meteoric fragment fields.", tags: ["ore", "mining", "endgame"], stats: { "Mining Level": 140, "Rare Gem": "Celestial Prism" } },
  { name: "Void Ore", group: "Ores", description: "Highest normal ore tier from void fissures.", tags: ["ore", "mining", "endgame"], stats: { "Mining Level": 160, "Rare Gem": "Void Pearl (0.005%)" }, codeNote: "Handoff also references Plasma Stone naming — normalize before schema." },
];

const BAR_MATERIALS: MaterialDef[] = [
  { name: "Bronze Bar", group: "Bars", description: "First normal alloy bar.", tags: ["bar", "fabrication"], recipe: "2 Copper Ore + 1 Tin Ore", stats: { "Stack Limit": 500 } },
  { name: "Iron Bar", group: "Bars", description: "Refined iron for iron-tier gear.", tags: ["bar", "fabrication"], recipe: "3 Iron Ore", stats: { "Stack Limit": 500 } },
  { name: "Steel Bar", group: "Bars", description: "Iron-coal alloy for steel equipment.", tags: ["bar", "fabrication"], recipe: "3 Iron Ore + 2 Coal", stats: { "Stack Limit": 500 } },
  { name: "Nickel Bar", group: "Bars", description: "Mid-tier structural bar.", tags: ["bar", "fabrication"], recipe: "3 Nickel Ore + 2 Iron Ore + 1 Coal" },
  { name: "Titanium Bar", group: "Bars", description: "Lightweight high-strength bar.", tags: ["bar", "fabrication"], recipe: "3 Titanium Ore + 2 Nickel Ore + 2 Coal" },
  { name: "Tungsten Bar", group: "Bars", description: "Dense bar for hardened tools and weapons.", tags: ["bar", "fabrication"], recipe: "4 Tungsten Ore + 2 Iron Ore + 2 Coal" },
  { name: "Cobalt Bar", group: "Bars", description: "Quartz-supported advanced bar.", tags: ["bar", "fabrication"], recipe: "4 Cobalt Ore + 3 Titanium Ore + 2 Nickel Ore + 1 Quartz" },
  { name: "Platinum Bar", group: "Bars", description: "Precious industrial bar.", tags: ["bar", "fabrication"], recipe: "4 Platinum Ore + 3 Tungsten Ore + 2 Quartz" },
  { name: "Iridium Bar", group: "Bars", description: "Rare bar for iridium-tier fabrication.", tags: ["bar", "fabrication"], recipe: "4 Iridium Ore + 3 Platinum Ore + 2 Tungsten Ore + 1 Quartz" },
  { name: "Palladium Bar", group: "Bars", description: "Late-game bar supporting palladium gear.", tags: ["bar", "fabrication"], recipe: "4 Palladium Ore + 3 Iridium Ore + 2 Platinum Ore + 1 Quartz" },
  { name: "Meteoric Bar", group: "Bars", description: "Exotic bar using obsidian support.", tags: ["bar", "fabrication"], recipe: "5 Meteoric Ore + 3 Iridium Ore + 2 Cobalt Ore + 2 Obsidian Shard" },
  { name: "Void Bar", group: "Bars", description: "Highest normal fabricated bar tier.", tags: ["bar", "fabrication"], recipe: "5 Void Ore + 3 Meteoric Ore + 2 Palladium Ore + 2 Obsidian Shard" },
];

const SALVAGE_MATERIALS: MaterialDef[] = [
  { name: "Scrap Metal", group: "Salvage", description: "Common salvage from low-tier wreck sites.", tags: ["salvage", "engineering"], drops: "Lv1: 70% · Lv5: 50% · Lv10: 35%", stats: { "Stack Limit": 1000, "Salvaging XP Lv1": 5 } },
  { name: "Wire Bundle", group: "Salvage", description: "Recovered wiring from hull stripping.", tags: ["salvage", "engineering"], drops: "Lv1: 30% · Lv20: 35%", stats: { "Stack Limit": 1000 } },
  { name: "Armor Plating", group: "Salvage", description: "Heavy plating from wreckage.", tags: ["salvage", "engineering"], drops: "Lv5: 20% · Lv75+: primary pool", stats: { "Stack Limit": 1000 } },
  { name: "Circuit Board", group: "Salvage", description: "Intact circuit boards from derelict systems.", tags: ["salvage", "engineering"], codeNote: "In-game inventory lists as Circuit; design doc uses Circuit Board.", drops: "Lv10: 10% · Lv40+: 35%", stats: { "Stack Limit": 1000 } },
  { name: "Sensor Parts", group: "Salvage", description: "Optical and scanner components for advanced engineering.", tags: ["salvage", "engineering"], drops: "Lv20: 10% · Lv75: 35%" },
  { name: "Power Cell", group: "Salvage", description: "Energy cell used in cartridges, modules, and repairs.", tags: ["salvage", "engineering"], drops: "Lv30: 10% · Lv200: 35%" },
  { name: "Servo Motor", group: "Salvage", description: "Actuator motor for high-tier engineering recipes.", tags: ["salvage", "engineering"], drops: "Lv40: 15% · Lv200: 25%" },
  { name: "Tech Core", group: "Salvage", description: "Rare salvaged core for modules and top-tier crafts.", tags: ["salvage", "engineering", "rare"], drops: "Lv75: 3% · Lv200: 35%" },
  { name: "Ancient Tech Core", group: "Salvage", description: "Endgame salvaged core from high-level sites.", tags: ["salvage", "engineering", "rare"], drops: "Lv150: 1% · Lv200: 5%" },
];

const HARVEST_MATERIALS: MaterialDef[] = [
  { name: "Fiberleaf", group: "Harvest", description: "Basic organic fiber and common synthesis base.", tags: ["harvest", "bio"], stats: { "First Level": 1, "Stack Limit": 1000 }, drops: "Lv1: 70%" },
  { name: "Spore Pod", group: "Harvest", description: "Common biological reagent.", tags: ["harvest", "bio"], drops: "Lv1: 30% · Lv20: 35%" },
  { name: "Medicinal Sap", group: "Harvest", description: "Main healing ingredient for synthesis gels.", tags: ["harvest", "bio", "medical"], drops: "Lv5: 20% · Lv75: 35%" },
  { name: "Resin Bloom", group: "Harvest", description: "Binding and stabilizing reagent; defense gel theme.", tags: ["harvest", "bio"], drops: "Lv10: 10% · Lv40: 35%" },
  { name: "Glowcap Fungus", group: "Harvest", description: "Mid-tier healing and support reagent.", tags: ["harvest", "bio"], drops: "Lv20: 10% · Lv100: 57%" },
  { name: "Venom Gland", group: "Harvest", description: "Attack serum ingredient.", tags: ["harvest", "bio", "combat"], drops: "Lv30: 10% · Lv200: 35%" },
  { name: "Bio-Crystal", group: "Harvest", description: "Advanced synthesis catalyst.", tags: ["harvest", "bio", "rare"], drops: "Lv40: 15% · Lv200: 25%" },
  { name: "Mutagen Root", group: "Harvest", description: "High-tier synthesis material.", tags: ["harvest", "bio", "rare"], drops: "Lv75: 3% · Lv200: 35%" },
  { name: "Ancient Seed Core", group: "Harvest", description: "Rare endgame biological material.", tags: ["harvest", "bio", "endgame"], drops: "Lv150: 1% · Lv200: 5%" },
];

const GEM_MATERIALS: MaterialDef[] = [
  { name: "Clouded Garnet", group: "Rare Gems", description: "First rare gem tier from silver veins.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "2,500 credits", "Drop Rate": "0.02%" }, sourceDoc: HANDOFF },
  { name: "Pale Sapphire", group: "Rare Gems", description: "Nickel-tier rare gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "3,500 credits" } },
  { name: "Bright Emerald", group: "Rare Gems", description: "Quartz outcrop gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "5,000 credits" } },
  { name: "Ember Ruby", group: "Rare Gems", description: "Titanium-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "7,500 credits", "Drop Rate": "0.015%" } },
  { name: "Star Opal", group: "Rare Gems", description: "Tungsten-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "10,000 credits" } },
  { name: "Azure Topaz", group: "Rare Gems", description: "Cobalt-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "12,500 credits" } },
  { name: "Royal Amethyst", group: "Rare Gems", description: "Platinum-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "17,500 credits", "Drop Rate": "0.01%" } },
  { name: "Astral Diamond", group: "Rare Gems", description: "Iridium-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "25,000 credits" } },
  { name: "Luminous Pearl", group: "Rare Gems", description: "Palladium-tier gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "35,000 credits", "Drop Rate": "0.0075%" } },
  { name: "Shadow Onyx", group: "Rare Gems", description: "Obsidian field gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "45,000 credits" } },
  { name: "Celestial Prism", group: "Rare Gems", description: "Meteoric field gem.", tags: ["gem", "mining", "rare"], stats: { "NPC Buy": "60,000 credits" } },
  { name: "Void Pearl", group: "Rare Gems", description: "Highest NPC-buy gem. Not used in standard gear progression.", tags: ["gem", "mining", "endgame"], stats: { "NPC Buy": "100,000 credits", "Drop Rate": "0.005%" } },
];

const SYNTH_CONSUMABLES: MaterialDef[] = [
  { name: "Micro Med Gel", group: "Synthesis", description: "Entry healing gel. NPC sells for 15 credits.", tags: ["consumable", "healing", "synthesis"], recipe: "1 Fiberleaf", stats: { Heal: "1 HP", "Synth Level": 1, "NPC Price": "15 credits" }, sourceDoc: HARVEST_SOURCE },
  { name: "Minor Med Gel", group: "Synthesis", description: "Early healing consumable.", tags: ["consumable", "healing"], recipe: "2 Fiberleaf + 1 Spore Pod", stats: { Heal: "5 HP", "Synth Level": 10 } },
  { name: "Med Gel", group: "Synthesis", description: "Mid-low healing gel.", tags: ["consumable", "healing"], stats: { Heal: "10 HP", "Synth Level": 25 } },
  { name: "Field Med Gel", group: "Synthesis", description: "Field-grade healing.", tags: ["consumable", "healing"], stats: { Heal: "25 HP", "Synth Level": 50 } },
  { name: "Trauma Gel", group: "Synthesis", description: "High-tier healing gel.", tags: ["consumable", "healing"], stats: { Heal: "50 HP", "Synth Level": 85 } },
  { name: "Recovery Gel", group: "Synthesis", description: "Top normal healing gel.", tags: ["consumable", "healing"], stats: { Heal: "100 HP", "Synth Level": 140 } },
  { name: "Energy Cartridge", group: "Synthesis", description: "Engineering-crafted ammo for all ranged attacks. Tradeable; stacks to 1,000.", tags: ["consumable", "engineering", "ammo"], recipe: "Batch recipes from Scrap + Wire + Circuit + Power Cell", stats: { "Per Attack": 1, "Stack Limit": 1000 }, sourceDoc: ENG_SOURCE },
  { name: "Battle Serum I", group: "Synthesis", description: "Attack boost consumable.", tags: ["consumable", "boost", "attack"], stats: { Effect: "+2% attack", Duration: "5 min", "Synth Level": 25 } },
  { name: "Guard Gel I", group: "Synthesis", description: "Defense boost consumable.", tags: ["consumable", "boost", "defense"], stats: { Effect: "+2% defense", Duration: "5 min" } },
  { name: "Yield Compound I", group: "Synthesis", description: "Bonus yield for mining, salvaging, and harvesting.", tags: ["consumable", "utility"], stats: { Effect: "+2% bonus yield", Duration: "5 min" } },
];

const FIELD_INVENTORY_STUBS: MaterialDef[] = [
  { name: "Fiberleaf", group: "Harvest", description: "Bio-fiber harvested at Spore Fen (in-game field stub).", tags: ["harvest", "field", "verdant rim"], codeNote: "Also listed in full harvest ladder." },
  { name: "Scrap Metal", group: "Salvage", description: "Common salvage from Wreck Flats (in-game).", tags: ["salvage", "field"], codeNote: "Also listed in full salvage ladder." },
  { name: "Wire Bundle", group: "Salvage", description: "Recovered wiring from wreck sites.", tags: ["salvage", "field"] },
  { name: "Armor Plating", group: "Salvage", description: "Heavy plating salvaged at Hulk Yard.", tags: ["salvage", "field"] },
  { name: "Circuit", group: "Salvage", description: "Circuit boards recovered from derelict hulks.", tags: ["salvage", "field"], codeNote: "Design doc name: Circuit Board." },
];

function materialEntry(def: MaterialDef, idSuffix?: string): CodexEntry {
  const slug = def.name.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `material-${slug}${idSuffix ?? ""}`,
    category: "materials",
    name: def.name,
    subtitle: `${def.group} · Field Material`,
    description: def.description,
    tags: def.tags,
    materialGroup: def.group,
    stats: def.stats,
    recipe: def.recipe,
    drops: def.drops,
    codeNote: def.codeNote,
    sourceDoc: def.sourceDoc ?? `${FAB_SOURCE} / ${ENG_SOURCE} / ${HARVEST_SOURCE}`,
  };
}

function uniqueMaterials(defs: MaterialDef[]): CodexEntry[] {
  const seen = new Set<string>();
  const entries: CodexEntry[] = [];
  for (const def of defs) {
    if (seen.has(def.name)) continue;
    seen.add(def.name);
    entries.push(materialEntry(def));
  }
  return entries;
}

export const MATERIAL_ENTRIES: CodexEntry[] = [
  ...TUTORIAL_MATERIALS,
  ...uniqueMaterials([
    ...ORE_MATERIALS,
    ...BAR_MATERIALS,
    ...SALVAGE_MATERIALS,
    ...HARVEST_MATERIALS,
    ...GEM_MATERIALS,
    ...SYNTH_CONSUMABLES,
    ...FIELD_INVENTORY_STUBS,
  ]),
];
