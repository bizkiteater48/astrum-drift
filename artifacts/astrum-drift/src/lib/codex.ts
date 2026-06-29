import {
  MAIN_GAME_LOCATIONS,
  MATERIAL_INVENTORY_GROUPS,
  type MainGameLocationId,
} from "@/lib/main-game";

export type CodexCategory = "tools" | "enemies" | "materials" | "locations";

export type CodexEntry = {
  id: string;
  category: CodexCategory;
  name: string;
  subtitle?: string;
  description: string;
  tags: string[];
  /** Tool: skill this item supports */
  skill?: string;
  /** Tool: action labels enabled when equipped */
  enabledActions?: string[];
  /** Tool: training vs field gear */
  tier?: "training" | "field";
  /** Enemy: tactical notes */
  intelNotes?: string;
  /** Enemy: relative threat */
  threatLevel?: "low" | "moderate" | "high" | "extreme";
  /** Material: inventory group */
  materialGroup?: string;
  /** Location: linked main-game id */
  locationId?: MainGameLocationId;
  /** Location: orbital / settlement / spaceport */
  locationLayer?: string;
  /** Location: planet name when applicable */
  planet?: string;
};

export const CODEX_CATEGORIES: {
  id: CodexCategory;
  label: string;
  blurb: string;
}[] = [
  {
    id: "tools",
    label: "Tools",
    blurb: "Hand-slot equipment for field actions",
  },
  {
    id: "enemies",
    label: "Enemies",
    blurb: "Hostile contacts and combat intel",
  },
  {
    id: "materials",
    label: "Materials",
    blurb: "Ores, bars, harvest, and salvage",
  },
  {
    id: "locations",
    label: "Locations",
    blurb: "Verdant Rim charted zones",
  },
];

const TOOL_ENTRIES: CodexEntry[] = [
  {
    id: "training-cutter",
    category: "tools",
    name: "Training Cutter",
    subtitle: "Mining · Training Gear",
    description:
      "A lightweight plasma cutter issued during Outpost One orientation. Designed for safe ore extraction in controlled industrial yards.",
    tags: ["mining", "training", "hand slot"],
    skill: "Mining",
    enabledActions: ["Mine Iron Ore"],
    tier: "training",
  },
  {
    id: "training-tool",
    category: "tools",
    name: "Training Tool",
    subtitle: "Fabrication · Training Gear",
    description:
      "Multi-purpose bench tool for refining ore, fabricating blades, and synthesizing consumables during the training arc.",
    tags: ["fabrication", "synthesis", "training", "hand slot"],
    skill: "Fabrication",
    enabledActions: [
      "Refine Iron Ore",
      "Fabricate Training Blade",
      "Synthesize Life Support Gel",
    ],
    tier: "training",
  },
  {
    id: "training-harvester",
    category: "tools",
    name: "Training Harvester",
    subtitle: "Harvesting · Training Gear",
    description:
      "Bio-field sampler for collecting organic compounds inside the Bio Dome training habitat.",
    tags: ["harvesting", "training", "hand slot"],
    skill: "Harvesting",
    enabledActions: ["Harvest Bio Samples"],
    tier: "training",
  },
  {
    id: "training-salvage-tool",
    category: "tools",
    name: "Training Salvage Tool",
    subtitle: "Salvaging · Training Gear",
    description:
      "Compact cutting torch and pry kit for stripping wreckage without damaging recoverable components.",
    tags: ["salvaging", "training", "hand slot"],
    skill: "Salvaging",
    enabledActions: ["Salvage Wreckage"],
    tier: "training",
  },
  {
    id: "training-repair-kit",
    category: "tools",
    name: "Training Repair Kit",
    subtitle: "Engineering · Training Gear",
    description:
      "Field repair kit with micro-welders and spare fasteners. Used to restore the Training Rover after salvage recovery.",
    tags: ["engineering", "training", "hand slot"],
    skill: "Engineering",
    enabledActions: ["Repair Training Rover"],
    tier: "training",
  },
  {
    id: "training-blade",
    category: "tools",
    name: "Training Blade",
    subtitle: "Combat · Training Gear",
    description:
      "A balanced mono-edge forged from Refined Iron during training. Required to engage the Training Drone safely.",
    tags: ["combat", "training", "hand slot", "weapon"],
    skill: "Combat",
    enabledActions: ["Fight Training Drone"],
    tier: "training",
  },
  {
    id: "basic-mining-tool",
    category: "tools",
    name: "Basic Mining Tool",
    subtitle: "Mining · Field Gear",
    description:
      "Standard-issue extraction rig for surface vein work across Aurelia Prime, Shimmer Coast, and Obsidian Crown mining sites.",
    tags: ["mining", "field", "hand slot"],
    skill: "Mining",
    enabledActions: [
      "Mine Copper Vein",
      "Mine Silver Vein",
      "Mine Nickel Deposit",
      "Fabricate Bronze Bar",
      "Fabricate Iron Bar",
    ],
    tier: "field",
  },
  {
    id: "basic-harvesting-tool",
    category: "tools",
    name: "Basic Harvesting Tool",
    subtitle: "Harvesting · Field Gear",
    description:
      "Sealed bio-harvester for fiberleaf collection in the Verdant Mire fen zones.",
    tags: ["harvesting", "field", "hand slot"],
    skill: "Harvesting",
    enabledActions: ["Harvest Fiberleaf"],
    tier: "field",
  },
  {
    id: "basic-salvage-tool",
    category: "tools",
    name: "Basic Salvage Tool",
    subtitle: "Salvaging · Field Gear",
    description:
      "Heavy-duty salvage rig for Scrapreach wreck fields and hulk yards. Strips hull plating and wiring without structural collapse.",
    tags: ["salvaging", "field", "hand slot"],
    skill: "Salvaging",
    enabledActions: [
      "Salvage Scrap Metal & Wire",
      "Salvage Armor Plating & Circuit",
    ],
    tier: "field",
  },
  {
    id: "basic-repair-kit",
    category: "tools",
    name: "Basic Repair Kit",
    subtitle: "Engineering · Field Gear",
    description:
      "Portable engineering kit for Tech Annex fabrication bays. Powers cartridge assembly and component repair workflows.",
    tags: ["engineering", "field", "hand slot"],
    skill: "Engineering",
    enabledActions: ["Craft Energy Cartridge"],
    tier: "field",
  },
  {
    id: "basic-weapon",
    category: "tools",
    name: "Basic Weapon",
    subtitle: "Combat · Field Gear",
    description:
      "Standard sidearm for sanctioned arena engagements. Required at Drift Arena and Hunter's Ring combat zones.",
    tags: ["combat", "field", "hand slot", "weapon"],
    skill: "Combat",
    enabledActions: [
      "Engage Balanced Opponent",
      "Engage Dangerous Hostile",
    ],
    tier: "field",
  },
];

const ENEMY_ENTRIES: CodexEntry[] = [
  {
    id: "training-drone",
    category: "enemies",
    name: "Training Drone",
    subtitle: "Training Grounds · Synthetic Hostile",
    description:
      "A non-lethal combat drone used in Outpost One orientation. Emits predictable attack patterns and drops Damaged Scrap on defeat.",
    tags: ["training", "synthetic", "drone"],
    threatLevel: "low",
    intelNotes:
      "Equip the Training Blade before engagement. After disabling the drone, apply Life Support Gel to complete post-combat recovery. Proficiency gains tracked per defeat.",
  },
  {
    id: "balanced-opponent",
    category: "enemies",
    name: "Balanced Opponent",
    subtitle: "Drift Arena · Arena Combatant",
    description:
      "A sanctioned sparring partner at Shimmer Coast's Drift Arena. Designed for moderate-risk combat XP without extreme gear requirements.",
    tags: ["arena", "combat", "shimmer coast"],
    threatLevel: "moderate",
    intelNotes:
      "Requires Basic Weapon equipped. Combat resolution is currently logged as a field stub — full round-based arena combat coming soon.",
  },
  {
    id: "dangerous-hostile",
    category: "enemies",
    name: "Dangerous Hostile",
    subtitle: "Hunter's Ring · Frontier Threat",
    description:
      "High-risk frontier combatant encountered at Obsidian Crown's Hunter's Ring. Reserved for pilots with solid combat proficiency.",
    tags: ["frontier", "combat", "obsidian crown"],
    threatLevel: "high",
    intelNotes:
      "Requires Basic Weapon equipped. Awards higher combat XP than balanced arena fights. Full encounter mechanics in development.",
  },
];

const TUTORIAL_MATERIAL_ENTRIES: CodexEntry[] = [
  {
    id: "iron-ore",
    category: "materials",
    name: "Iron Ore",
    subtitle: "Tutorial · Raw Ore",
    description: "Unrefined iron extracted during Industrial Yard training.",
    tags: ["ore", "tutorial", "mining"],
    materialGroup: "Tutorial",
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
  },
  {
    id: "bio-fiber",
    category: "materials",
    name: "Bio Fiber",
    subtitle: "Tutorial · Harvest",
    description:
      "Organic fiber harvested in the Bio Dome for synthesis recipes.",
    tags: ["harvest", "tutorial", "bio"],
    materialGroup: "Tutorial",
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
  },
];

function buildMaterialEntries(): CodexEntry[] {
  const entries: CodexEntry[] = [...TUTORIAL_MATERIAL_ENTRIES];

  for (const [group, items] of Object.entries(MATERIAL_INVENTORY_GROUPS)) {
    for (const itemName of items) {
      entries.push({
        id: `material-${itemName.toLowerCase().replace(/\s+/g, "-")}`,
        category: "materials",
        name: itemName,
        subtitle: `${group} · Field Material`,
        description: getMaterialDescription(itemName, group),
        tags: [group.toLowerCase(), "field", "verdant rim"],
        materialGroup: group,
      });
    }
  }

  return entries;
}

function getMaterialDescription(itemName: string, group: string): string {
  const descriptions: Record<string, string> = {
    "Copper Ore": "Raw copper from Aurelia Prime vein sites. Combined with Tin Ore for bronze fabrication.",
    "Tin Ore": "Secondary ore used in bronze bar recipes at Brassworks Yard.",
    "Iron Ore": "Industrial iron ore for iron bar production.",
    "Silver Ore": "Precious ore mined at Silver Shallows on Shimmer Coast.",
    "Nickel Ore": "Frontier ore extracted at Nickel Rift on Obsidian Crown.",
    "Bronze Bar": "Alloy bar fabricated from Copper Ore and Tin Ore.",
    "Iron Bar": "Refined bar smelted from Iron Ore at Brassworks Yard.",
    "Refined Iron": "High-grade iron stock for advanced fabrication.",
    Fiberleaf: "Bio-fiber harvested at Spore Fen in the Verdant Mire.",
    "Bio Fiber": "Processed organic fiber for synthesis chains.",
    "Basic Chemical": "Standard reagent used in bio-synthesis.",
    "Scrap Metal": "Common salvage from Wreck Flats hull stripping.",
    "Wire Bundle": "Recovered wiring from wreck sites.",
    "Armor Plating": "Heavy plating salvaged at Hulk Yard.",
    Circuit: "Intact circuit boards recovered from derelict hulks.",
    "Damaged Scrap": "Low-grade scrap with limited resale value.",
    "Salvage Parts": "General-purpose repair components.",
  };

  return (
    descriptions[itemName] ??
    `${itemName} — a ${group.toLowerCase()} resource tracked in your field inventory.`
  );
}

const PLANET_LABELS: Record<string, string> = {
  aurelia_prime: "Aurelia Prime",
  verdant_mire: "Verdant Mire",
  scrapreach: "Scrapreach",
  shimmer_coast: "Shimmer Coast",
  obsidian_crown: "Obsidian Crown",
};

function getLocationDescription(
  name: string,
  layer: string,
  actions: string[],
): string {
  if (layer === "Spaceport") {
    return "Outpost One orbital hub. Central departure point for all Verdant Rim planetary transit.";
  }
  if (layer === "Orbital") {
    return `Planetary orbit zone for ${name}. Transit hub for surface settlement travel.`;
  }
  if (actions.length > 0) {
    return `Surface settlement with field operations: ${actions.join(", ")}.`;
  }
  if (name.includes("Gate") || name.includes("Port") || name.includes("haven") || name.includes("crest") || name.includes("fall")) {
    return "Main settlement trade hub with player market access.";
  }
  return `Charted ${layer.toLowerCase()} zone in the Verdant Rim survey archive.`;
}

function buildLocationEntries(): CodexEntry[] {
  return Object.values(MAIN_GAME_LOCATIONS).map((location) => {
    const layer =
      location.locationType === "spaceport"
        ? "Spaceport"
        : location.locationType === "planet_orbit"
          ? "Orbital"
          : "Settlement";

    const actionLabels = location.actions.map((action) => action.label);

    return {
      id: `location-${location.id}`,
      category: "locations",
      name: location.name,
      subtitle: location.systemName,
      description: getLocationDescription(
        location.name,
        layer,
        actionLabels,
      ),
      tags: [
        layer.toLowerCase(),
        location.planetId ?? "outpost",
        "verdant rim",
      ],
      locationId: location.id,
      locationLayer: layer,
      planet: location.planetId
        ? PLANET_LABELS[location.planetId]
        : undefined,
    };
  });
}

export const CODEX_ENTRIES: CodexEntry[] = [
  ...TOOL_ENTRIES,
  ...ENEMY_ENTRIES,
  ...buildMaterialEntries(),
  ...buildLocationEntries(),
];

export function getCodexEntriesByCategory(
  category: CodexCategory,
): CodexEntry[] {
  return CODEX_ENTRIES.filter((entry) => entry.category === category);
}

export function getCodexEntryById(id: string): CodexEntry | undefined {
  return CODEX_ENTRIES.find((entry) => entry.id === id);
}

export function searchCodexEntries(
  query: string,
  category?: CodexCategory,
): CodexEntry[] {
  const normalized = query.trim().toLowerCase();
  const pool = category
    ? getCodexEntriesByCategory(category)
    : CODEX_ENTRIES;

  if (!normalized) return pool;

  return pool.filter((entry) => {
    const haystack = [
      entry.name,
      entry.subtitle ?? "",
      entry.description,
      entry.skill ?? "",
      entry.intelNotes ?? "",
      entry.materialGroup ?? "",
      entry.planet ?? "",
      entry.locationLayer ?? "",
      ...(entry.enabledActions ?? []),
      ...entry.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
