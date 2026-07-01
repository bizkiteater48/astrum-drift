import type { CodexEntry } from "./types";

const FAB_SOURCE = "Astrum_Drift_Mining_Fabrication_Final.xlsx";
const ENG_SOURCE =
  "Astrum_Drift_Engineering_Salvaging_Master_READY_Vehicle_Repair.xlsx";

const FIELD_STUB_TOOLS: CodexEntry[] = [
  {
    id: "basic-mining-tool",
    category: "tools",
    name: "Basic Mining Tool",
    subtitle: "Mining · Field Gear",
    description:
      "Standard-issue extraction rig for surface vein work. In the full fabrication ladder this corresponds to the Basic Pickaxe tier.",
    tags: ["mining", "field", "hand slot"],
    skill: "Mining",
    tier: "field",
    toolGroup: "Field Gear",
    enabledActions: [
      "Mine Copper Vein",
      "Mine Silver Vein",
      "Mine Nickel Deposit",
      "Fabricate Bronze Bar",
      "Fabricate Iron Bar",
    ],
    codeNote: "In-game name Basic Mining Tool; design doc equivalent is Basic Pickaxe (2 Bronze Bars).",
    recipe: "2 Bronze Bars",
    stats: { "Durability Tier": "Basic", "Design Attack N/A": "Gathering tool" },
    sourceDoc: `${FAB_SOURCE} + main-game.ts`,
  },
  {
    id: "basic-harvesting-tool",
    category: "tools",
    name: "Basic Harvesting Tool",
    subtitle: "Harvesting · Field Gear",
    description:
      "Sealed bio-harvester for fiberleaf collection in fen zones. Design equivalent: Basic Extractor.",
    tags: ["harvesting", "field", "hand slot"],
    skill: "Harvesting",
    tier: "field",
    toolGroup: "Field Gear",
    enabledActions: ["Harvest Fiberleaf"],
    codeNote: "In-game Basic Harvesting Tool; design doc Basic Extractor (3 Sensor Parts + 2 Wire Bundle).",
    recipe: "3 Sensor Parts + 2 Wire Bundle",
    sourceDoc: `${ENG_SOURCE} + main-game.ts`,
  },
  {
    id: "basic-salvage-tool",
    category: "tools",
    name: "Basic Salvage Tool",
    subtitle: "Salvaging · Field Gear",
    description:
      "Heavy-duty salvage rig for wreck fields and hulk yards. Design equivalent: Basic Cutter.",
    tags: ["salvaging", "field", "hand slot"],
    skill: "Salvaging",
    tier: "field",
    toolGroup: "Field Gear",
    enabledActions: [
      "Salvage Scrap Metal & Wire",
      "Salvage Armor Plating & Circuit",
    ],
    codeNote: "In-game Basic Salvage Tool; design doc Basic Cutter (3 Scrap Metal + 2 Wire Bundle).",
    recipe: "3 Scrap Metal + 2 Wire Bundle",
    sourceDoc: `${ENG_SOURCE} + main-game.ts`,
  },
  {
    id: "basic-repair-kit",
    category: "tools",
    name: "Basic Repair Kit",
    subtitle: "Engineering · Field Gear",
    description:
      "Portable engineering kit for Tech Annex fabrication bays. Powers cartridge assembly workflows.",
    tags: ["engineering", "field", "hand slot"],
    skill: "Engineering",
    tier: "field",
    toolGroup: "Field Gear",
    enabledActions: ["Craft Energy Cartridge"],
    codeNote: "In-game Basic Repair Kit; design doc uses Basic Tech Kit for engineering crafts.",
    sourceDoc: `${ENG_SOURCE} + main-game.ts`,
  },
  {
    id: "basic-weapon",
    category: "tools",
    name: "Basic Weapon",
    subtitle: "Combat · Field Gear",
    description:
      "Standard sidearm for sanctioned arena engagements. Benchmark melee equivalent at early tiers is Bronze Blade (Attack 3).",
    tags: ["combat", "field", "hand slot", "weapon"],
    skill: "Combat",
    tier: "field",
    toolGroup: "Field Gear",
    enabledActions: ["Engage Balanced Opponent", "Engage Dangerous Hostile"],
    stats: { "Melee Equivalent": "Bronze Blade", Attack: 3 },
    sourceDoc: `${FAB_SOURCE} + main-game.ts`,
  },
];

type ToolTier = {
  name: string;
  tier: string;
  recipe: string;
  engLevel?: number;
};

const MINING_TOOLS: ToolTier[] = [
  { name: "Basic Pickaxe", tier: "Basic", recipe: "2 Bronze Bars" },
  { name: "Reinforced Pickaxe", tier: "Reinforced", recipe: "4 Steel Bars" },
  {
    name: "Improved Pickaxe",
    tier: "Improved",
    recipe: "4 Steel Bars + 1 Nickel Bar",
  },
  {
    name: "Prototype Mining Drill",
    tier: "Prototype",
    recipe: "5 Nickel Bars + 1 Quartz",
  },
  {
    name: "Advanced Mining Drill",
    tier: "Advanced",
    recipe: "6 Tungsten Bars + 2 Quartz",
  },
  {
    name: "Precision Mining Drill",
    tier: "Precision",
    recipe: "7 Cobalt Bars + 3 Quartz",
  },
  {
    name: "Hardened Bore Drill",
    tier: "Hardened",
    recipe: "8 Iridium Bars + 3 Quartz",
  },
  {
    name: "High-Output Bore Drill",
    tier: "High-Output",
    recipe: "9 Palladium Bars + 4 Quartz",
  },
  {
    name: "Void-Tuned Excavator",
    tier: "Void-Tuned",
    recipe: "10 Meteoric Bars + 5 Quartz",
  },
  {
    name: "Plasma Excavator",
    tier: "Plasma",
    recipe: "12 Void Bars + 6 Quartz",
  },
];

const SALVAGE_CUTTERS: ToolTier[] = [
  { name: "Basic Cutter", tier: "Basic", recipe: "3 Scrap Metal + 2 Wire Bundle", engLevel: 1 },
  { name: "Reinforced Cutter", tier: "Reinforced", recipe: "5 Scrap Metal + 3 Wire Bundle + 2 Circuit Board", engLevel: 10 },
  { name: "Improved Cutter", tier: "Improved", recipe: "6 Armor Plating + 4 Circuit Board + 2 Power Cell", engLevel: 20 },
  { name: "Prototype Cutter", tier: "Prototype", recipe: "10 Armor Plating + 6 Circuit Board + 4 Power Cell + 2 Servo Motor", engLevel: 35 },
  { name: "Advanced Cutter", tier: "Advanced", recipe: "18 Armor Plating + 10 Circuit Board + 8 Power Cell + 5 Servo Motor", engLevel: 50 },
  { name: "Precision Cutter", tier: "Precision", recipe: "28 Armor Plating + 14 Circuit Board + 14 Power Cell + 8 Servo Motor + 1 Tech Core", engLevel: 75 },
  { name: "Hardened Cutter", tier: "Hardened", recipe: "45 Armor Plating + 22 Circuit Board + 24 Power Cell + 14 Servo Motor + 2 Tech Core", engLevel: 100 },
  { name: "High-Output Cutter", tier: "High-Output", recipe: "70 Armor Plating + 35 Circuit Board + 38 Power Cell + 24 Servo Motor + 4 Tech Core", engLevel: 150 },
  { name: "Void-Tuned Cutter", tier: "Void-Tuned", recipe: "110 Armor Plating + 55 Circuit Board + 65 Power Cell + 40 Servo Motor + 8 Tech Core", engLevel: 175 },
  { name: "Plasma Cutter", tier: "Plasma", recipe: "170 Armor Plating + 85 Circuit Board + 100 Power Cell + 65 Servo Motor + 14 Tech Core + 1 Ancient Tech Core", engLevel: 200 },
];

const HARVEST_EXTRACTORS: ToolTier[] = [
  { name: "Basic Extractor", tier: "Basic", recipe: "3 Sensor Parts + 2 Wire Bundle", engLevel: 1 },
  { name: "Reinforced Extractor", tier: "Reinforced", recipe: "5 Sensor Parts + 3 Circuit Board + 2 Wire Bundle", engLevel: 10 },
  { name: "Improved Extractor", tier: "Improved", recipe: "8 Sensor Parts + 5 Circuit Board + 2 Power Cell", engLevel: 20 },
  { name: "Prototype Extractor", tier: "Prototype", recipe: "12 Sensor Parts + 7 Circuit Board + 4 Power Cell + 1 Servo Motor", engLevel: 35 },
  { name: "Advanced Extractor", tier: "Advanced", recipe: "22 Sensor Parts + 12 Circuit Board + 8 Power Cell + 4 Servo Motor", engLevel: 50 },
  { name: "Precision Extractor", tier: "Precision", recipe: "35 Sensor Parts + 18 Circuit Board + 14 Power Cell + 7 Servo Motor + 1 Tech Core", engLevel: 75 },
  { name: "Hardened Extractor", tier: "Hardened", recipe: "55 Sensor Parts + 28 Circuit Board + 24 Power Cell + 12 Servo Motor + 2 Tech Core", engLevel: 100 },
  { name: "High-Output Extractor", tier: "High-Output", recipe: "85 Sensor Parts + 42 Circuit Board + 38 Power Cell + 20 Servo Motor + 4 Tech Core", engLevel: 150 },
  { name: "Void-Tuned Extractor", tier: "Void-Tuned", recipe: "130 Sensor Parts + 65 Circuit Board + 65 Power Cell + 34 Servo Motor + 8 Tech Core", engLevel: 175 },
  { name: "Plasma Extractor", tier: "Plasma", recipe: "200 Sensor Parts + 100 Circuit Board + 100 Power Cell + 55 Servo Motor + 14 Tech Core + 1 Ancient Tech Core", engLevel: 200 },
];

function toolEntry(
  tool: ToolTier,
  skill: string,
  skillTag: string,
  source: string,
  toolGroup: string,
): CodexEntry {
  return {
    id: `tool-${tool.name.toLowerCase().replace(/\s+/g, "-")}`,
    category: "tools",
    name: tool.name,
    subtitle: `${skill} · ${tool.tier} Tier`,
    description: `${tool.name} is a ${tool.tier.toLowerCase()}-tier ${skill.toLowerCase()} tool fabricated through the production ladder.`,
    tags: [skillTag, tool.tier.toLowerCase(), "equipment"],
    skill,
    tier: tool.tier,
    toolGroup,
    recipe: tool.recipe,
    requirements: tool.engLevel
      ? `Engineering Level ${tool.engLevel}`
      : "Fabrication recipe",
    stats: {
      "Durability Tier": tool.tier,
      ...(tool.engLevel ? { "Engineering Level": tool.engLevel } : {}),
    },
    sourceDoc: source,
  };
}

const MELEE_BANDS: {
  band: string;
  spear: number;
  blade: number;
  axe: number;
  helmet: number;
  suit: number;
}[] = [
  { band: "Bronze", spear: 2, blade: 3, axe: 4, helmet: 3, suit: 6 },
  { band: "Iron", spear: 2, blade: 3, axe: 4, helmet: 3, suit: 6 },
  { band: "Steel", spear: 2, blade: 3, axe: 4, helmet: 3, suit: 6 },
  { band: "Nickel", spear: 3, blade: 4, axe: 5, helmet: 4, suit: 8 },
  { band: "Titanium", spear: 3, blade: 4, axe: 5, helmet: 4, suit: 8 },
  { band: "Tungsten", spear: 3, blade: 4, axe: 5, helmet: 4, suit: 8 },
  { band: "Cobalt", spear: 4, blade: 5, axe: 6, helmet: 5, suit: 10 },
  { band: "Platinum", spear: 4, blade: 5, axe: 6, helmet: 5, suit: 10 },
  { band: "Iridium", spear: 4, blade: 5, axe: 6, helmet: 5, suit: 10 },
  { band: "Palladium", spear: 4, blade: 5, axe: 6, helmet: 5, suit: 10 },
  { band: "Meteoric", spear: 5, blade: 6, axe: 7, helmet: 6, suit: 12 },
  { band: "Void", spear: 5, blade: 6, axe: 7, helmet: 6, suit: 12 },
];

const MELEE_RECIPES: Record<string, { spear: string; blade: string; axe: string }> =
  {
    Bronze: {
      spear: "4 Bronze Bars",
      blade: "2 Iron Bars",
      axe: "4 Iron Bars",
    },
    Iron: { spear: "4 Iron Bars", blade: "2 Iron Bars", axe: "4 Iron Bars" },
    Steel: { spear: "2 Steel Bars", blade: "2 Steel Bars", axe: "4 Steel Bars" },
    Nickel: {
      spear: "3 Nickel Bars",
      blade: "3 Nickel Bars",
      axe: "5 Nickel Bars",
    },
    Titanium: {
      spear: "3 Titanium Bars",
      blade: "3 Titanium Bars",
      axe: "5 Titanium Bars",
    },
    Tungsten: {
      spear: "3 Tungsten Bars",
      blade: "3 Tungsten Bars",
      axe: "5 Tungsten Bars",
    },
    Cobalt: {
      spear: "4 Cobalt Bars + 1 Quartz",
      blade: "4 Cobalt Bars + 1 Quartz",
      axe: "6 Cobalt Bars + 2 Quartz",
    },
    Platinum: {
      spear: "4 Platinum Bars + 1 Quartz",
      blade: "4 Platinum Bars + 1 Quartz",
      axe: "6 Platinum Bars + 2 Quartz",
    },
    Iridium: {
      spear: "4 Iridium Bars + 1 Quartz",
      blade: "4 Iridium Bars + 1 Quartz",
      axe: "6 Iridium Bars + 2 Quartz",
    },
    Palladium: {
      spear: "4 Palladium Bars + 1 Quartz",
      blade: "4 Palladium Bars + 1 Quartz",
      axe: "6 Palladium Bars + 2 Quartz",
    },
    Meteoric: {
      spear: "5 Meteoric Bars + 2 Obsidian Shard",
      blade: "5 Meteoric Bars + 2 Obsidian Shard",
      axe: "7 Meteoric Bars + 4 Obsidian Shard",
    },
    Void: {
      spear: "5 Void Bars + 3 Obsidian Shard",
      blade: "5 Void Bars + 3 Obsidian Shard",
      axe: "7 Void Bars + 5 Obsidian Shard",
    },
  };

function meleeEntries(): CodexEntry[] {
  const entries: CodexEntry[] = [];
  for (const band of MELEE_BANDS) {
    const recipes = MELEE_RECIPES[band.band];
    for (const type of ["Spear", "Blade", "Axe"] as const) {
      const attack =
        type === "Spear" ? band.spear : type === "Blade" ? band.blade : band.axe;
      const name = `${band.band} ${type}`;
      entries.push({
        id: `weapon-${band.band.toLowerCase()}-${type.toLowerCase()}`,
        category: "tools",
        name,
        subtitle: `Combat · Melee · ${band.band}`,
        description: `${name} is a fabricated melee weapon in the ${band.band} material band. Normal gear breakage is binary: good or broken.`,
        tags: ["combat", "melee", "fabrication", band.band.toLowerCase()],
        skill: "Combat",
        tier: band.band,
        toolGroup: "Melee Weapons",
        recipe: recipes[type.toLowerCase() as "spear" | "blade" | "axe"],
        stats: { Attack: attack, Type: type },
        sourceDoc: FAB_SOURCE,
      });
    }
  }
  return entries;
}

const RANGED_TIERS: {
  tier: string;
  pistol: { atk: number; acc: string; recipe: string };
  carbine: { atk: number; acc: string; recipe: string };
  rifle: { atk: number; acc: string; recipe: string };
}[] = [
  {
    tier: "Prototype",
    pistol: { atk: 4, acc: "92%", recipe: "16 Circuit Board + 10 Sensor Parts + 8 Wire Bundle + 2 Power Cell" },
    carbine: { atk: 5, acc: "88%", recipe: "20 Circuit Board + 13 Sensor Parts + 10 Wire Bundle + 3 Power Cell" },
    rifle: { atk: 6, acc: "82%", recipe: "24 Circuit Board + 16 Sensor Parts + 12 Armor Plating + 4 Power Cell" },
  },
  {
    tier: "Reinforced",
    pistol: { atk: 5, acc: "92%", recipe: "22 Circuit Board + 16 Sensor Parts + 6 Power Cell + 3 Servo Motor" },
    carbine: { atk: 6, acc: "88%", recipe: "28 Circuit Board + 20 Sensor Parts + 8 Power Cell + 4 Servo Motor" },
    rifle: { atk: 7, acc: "82%", recipe: "34 Circuit Board + 24 Sensor Parts + 10 Power Cell + 5 Servo Motor" },
  },
  {
    tier: "Calibrated",
    pistol: { atk: 6, acc: "92%", recipe: "30 Sensor Parts + 14 Power Cell + 8 Servo Motor + 1 Tech Core" },
    carbine: { atk: 7, acc: "88%", recipe: "38 Sensor Parts + 17 Power Cell + 10 Servo Motor + 1 Tech Core" },
    rifle: { atk: 8, acc: "82%", recipe: "45 Sensor Parts + 21 Power Cell + 12 Servo Motor + 1 Tech Core" },
  },
  {
    tier: "Precision",
    pistol: { atk: 7, acc: "92%", recipe: "42 Power Cell + 28 Servo Motor + 2 Tech Core" },
    carbine: { atk: 8, acc: "88%", recipe: "52 Power Cell + 35 Servo Motor + 3 Tech Core" },
    rifle: { atk: 9, acc: "82%", recipe: "63 Power Cell + 42 Servo Motor + 3 Tech Core" },
  },
  {
    tier: "Hardened",
    pistol: { atk: 8, acc: "92%", recipe: "52 Power Cell + 38 Servo Motor + 3 Tech Core" },
    carbine: { atk: 9, acc: "88%", recipe: "65 Power Cell + 48 Servo Motor + 4 Tech Core" },
    rifle: { atk: 10, acc: "82%", recipe: "78 Power Cell + 57 Servo Motor + 5 Tech Core" },
  },
  {
    tier: "Void-Tuned",
    pistol: { atk: 11, acc: "92%", recipe: "210 Power Cell + 180 Servo Motor + 26 Tech Core + 3 Ancient Tech Core" },
    carbine: { atk: 12, acc: "88%", recipe: "260 Power Cell + 225 Servo Motor + 32 Tech Core + 4 Ancient Tech Core" },
    rifle: { atk: 13, acc: "82%", recipe: "315 Power Cell + 270 Servo Motor + 39 Tech Core + 4 Ancient Tech Core" },
  },
];

function rangedEntries(): CodexEntry[] {
  const entries: CodexEntry[] = [];
  const names = {
    pistol: "Pulse Pistol",
    carbine: "Coil Carbine",
    rifle: "Rail Rifle",
  } as const;

  for (const row of RANGED_TIERS) {
    for (const kind of ["pistol", "carbine", "rifle"] as const) {
      const weapon = row[kind];
      const baseName = names[kind];
      const name = `${row.tier} ${baseName}`;
      entries.push({
        id: `weapon-${row.tier.toLowerCase()}-${kind}`,
        category: "tools",
        name,
        subtitle: `Combat · Ranged · ${row.tier}`,
        description: `${name} is an engineering-crafted ranged weapon. Every attack consumes 1 Energy Cartridge, including misses. Standard ranged weapons are replaced when broken, not routine-repaired.`,
        tags: ["combat", "ranged", "engineering", row.tier.toLowerCase()],
        skill: "Engineering",
        tier: row.tier,
        toolGroup: "Ranged Weapons",
        recipe: weapon.recipe,
        stats: {
          Attack: weapon.atk,
          Accuracy: weapon.acc,
          Ammo: "1 Energy Cartridge / attack",
        },
        sourceDoc: ENG_SOURCE,
      });
    }
  }
  return entries;
}

const ARMOR_SUIT_RECIPES: Record<string, string> = {
  "Bronze Helmet": "3 Bronze Bars",
  "Bronze Armor Suit": "6 Bronze Bars",
  "Iron Helmet": "3 Iron Bars",
  "Iron Armor Suit": "6 Iron Bars",
  "Steel Helmet": "3 Steel Bars",
  "Steel Armor Suit": "6 Steel Bars",
  "Nickel Helmet": "4 Nickel Bars",
  "Nickel Armor Suit": "8 Nickel Bars",
  "Cobalt Helmet": "5 Cobalt Bars + 1 Quartz",
  "Cobalt Armor Suit": "10 Cobalt Bars + 2 Quartz",
  "Void Helmet": "6 Void Bars + 3 Quartz + 3 Obsidian Shard",
  "Void Armor Suit": "12 Void Bars + 4 Quartz + 6 Obsidian Shard",
};

function armorEntries(): CodexEntry[] {
  return Object.entries(ARMOR_SUIT_RECIPES).map(([name, recipe]) => {
    const isHelmet = name.includes("Helmet");
    const band = name.split(" ")[0];
    const defense = isHelmet ? MELEE_BANDS.find((b) => b.band === band)?.helmet : MELEE_BANDS.find((b) => b.band === band)?.suit;
    return {
      id: `armor-${name.toLowerCase().replace(/\s+/g, "-")}`,
      category: "tools",
      name,
      subtitle: `Combat · ${isHelmet ? "Helmet" : "Armor Suit"} · ${band}`,
      description: `${name} provides armor defense for combat. Defense bonuses apply after base armor defense.`,
      tags: ["combat", "armor", "fabrication", band.toLowerCase()],
      skill: "Combat",
      tier: band,
      toolGroup: "Armor",
      recipe,
      stats: { Defense: defense ?? "—", Slot: isHelmet ? "Helmet" : "Suit" },
      sourceDoc: FAB_SOURCE,
    };
  });
}

export const TOOL_ENTRIES: CodexEntry[] = [
  ...FIELD_STUB_TOOLS,
  ...MINING_TOOLS.map((t) =>
    toolEntry(t, "Mining", "mining", FAB_SOURCE, "Mining Tools"),
  ),
  ...SALVAGE_CUTTERS.map((t) =>
    toolEntry(t, "Salvaging", "salvaging", ENG_SOURCE, "Salvaging Cutters"),
  ),
  ...HARVEST_EXTRACTORS.map((t) =>
    toolEntry(t, "Harvesting", "harvesting", ENG_SOURCE, "Harvesting Extractors"),
  ),
  ...meleeEntries(),
  ...rangedEntries(),
  ...armorEntries(),
];
