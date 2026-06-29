import {
  MAIN_GAME_LOCATIONS,
  type MainGameLocationId,
} from "@/lib/main-game";
import type { CodexEntry } from "./types";

const FAB_SOURCE = "Astrum_Drift_Mining_Fabrication_Final.xlsx";
const HANDOFF = "Astrum_Drift_AI_Handoff_Full_Project_Brief.md";

const PLANET_LABELS: Record<string, string> = {
  aurelia_prime: "Aurelia Prime",
  verdant_mire: "Verdant Mire",
  scrapreach: "Scrapreach",
  shimmer_coast: "Shimmer Coast",
  obsidian_crown: "Obsidian Crown",
};

/** Mining sites from Astrum_Drift_Mining_Fabrication_Final.xlsx */
const MINING_SITES: {
  level: number;
  location: string;
  material: string;
  xp: number;
  gem?: string;
  gemRate?: string;
}[] = [
  { level: 1, location: "Copper Vein", material: "Copper Ore", xp: 5 },
  { level: 5, location: "Tin Vein", material: "Tin Ore", xp: 8 },
  { level: 10, location: "Iron Deposit", material: "Iron Ore", xp: 14 },
  { level: 15, location: "Coal Seam", material: "Coal", xp: 25 },
  {
    level: 20,
    location: "Silver Vein",
    material: "Silver Ore",
    xp: 25,
    gem: "Clouded Garnet",
    gemRate: "0.02%",
  },
  {
    level: 25,
    location: "Nickel Deposit",
    material: "Nickel Ore",
    xp: 40,
    gem: "Pale Sapphire",
  },
  {
    level: 30,
    location: "Quartz Outcrop",
    material: "Quartz",
    xp: 40,
    gem: "Bright Emerald",
  },
  {
    level: 40,
    location: "Titanium Deposit",
    material: "Titanium Ore",
    xp: 70,
    gem: "Ember Ruby",
    gemRate: "0.015%",
  },
  {
    level: 50,
    location: "Tungsten Deposit",
    material: "Tungsten Ore",
    xp: 70,
    gem: "Star Opal",
  },
  {
    level: 60,
    location: "Cobalt Vein",
    material: "Cobalt Ore",
    xp: 250,
    gem: "Azure Topaz",
  },
  {
    level: 75,
    location: "Platinum Vein",
    material: "Platinum Ore",
    xp: 250,
    gem: "Royal Amethyst",
    gemRate: "0.01%",
  },
  {
    level: 90,
    location: "Iridium Deposit",
    material: "Iridium Ore",
    xp: 350,
    gem: "Astral Diamond",
  },
  {
    level: 105,
    location: "Palladium Deposit",
    material: "Palladium Ore",
    xp: 625,
    gem: "Luminous Pearl",
    gemRate: "0.0075%",
  },
  {
    level: 120,
    location: "Obsidian Field",
    material: "Obsidian Shard",
    xp: 1050,
    gem: "Shadow Onyx",
  },
  {
    level: 140,
    location: "Meteoric Fragment Field",
    material: "Meteoric Ore",
    xp: 2000,
    gem: "Celestial Prism",
  },
  {
    level: 160,
    location: "Void Fissure",
    material: "Void Ore",
    xp: 3000,
    gem: "Void Pearl",
    gemRate: "0.005%",
  },
];

const MINING_LOCATION_GAME_MAP: Record<string, { settlement: string; planet: string }> = {
  "Copper Vein": { settlement: "Copper Flats", planet: "Aurelia Prime" },
  "Iron Deposit": { settlement: "Brassworks Yard", planet: "Aurelia Prime" },
  "Silver Vein": { settlement: "Silver Shallows", planet: "Shimmer Coast" },
  "Nickel Deposit": { settlement: "Nickel Rift", planet: "Obsidian Crown" },
};

function miningLocationEntries(): CodexEntry[] {
  return MINING_SITES.map((site) => {
    const mapped = MINING_LOCATION_GAME_MAP[site.location];
    return {
      id: `location-mining-${site.location.toLowerCase().replace(/\s+/g, "-")}`,
      category: "locations",
      name: site.location,
      subtitle: `Mining Site · ML ${site.level}`,
      description: `${site.location} yields ${site.material} per action with bonus yield procs granting +1 additional unit. Rare gems do not grant extra XP.`,
      tags: ["mining", "resource site", `ml-${site.level}`],
      locationLayer: "Mining Site",
      planet: mapped?.planet,
      stats: {
        "Mining Level": site.level,
        "Primary Material": site.material,
        "XP per Action": site.xp,
        "Base Output": `1 ${site.material}`,
        ...(site.gem
          ? { "Rare Gem": site.gem, "Gem Drop Rate": site.gemRate ?? "Tier-based" }
          : {}),
      },
      requirements: `Mining Level ${site.level}`,
      codeNote: mapped
        ? `Implemented in-game near ${mapped.settlement} on ${mapped.planet}.`
        : "Not yet mapped to a Verdant Rim settlement in main-game.ts.",
      sourceDoc: FAB_SOURCE,
      contentTier: site.level <= 25 ? 1 : site.level <= 50 ? 2 : site.level <= 75 ? 3 : site.level <= 100 ? 4 : site.level <= 125 ? 5 : site.level <= 150 ? 6 : site.level <= 175 ? 7 : 8,
    };
  });
}

function getLocationDescription(
  name: string,
  layer: string,
  actions: string[],
): string {
  if (layer === "Spaceport") {
    return "Outpost One orbital hub. Central departure point for all Verdant Rim planetary transit. P2P trade tax 2%.";
  }
  if (layer === "Orbital") {
    return `Planetary orbit zone for ${name}. Transit hub for surface settlement travel.`;
  }
  if (actions.length > 0) {
    return `Surface settlement with field operations: ${actions.join(", ")}.`;
  }
  if (
    name.includes("Gate") ||
    name.includes("Port") ||
    name.includes("haven") ||
    name.includes("crest") ||
    name.includes("fall")
  ) {
    return "Main settlement trade hub with player market access. P2P trade tax 8%.";
  }
  return `Charted ${layer.toLowerCase()} zone in the Verdant Rim survey archive.`;
}

function gameLocationEntries(): CodexEntry[] {
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
        "playable",
      ],
      locationId: location.id as MainGameLocationId,
      locationLayer: layer,
      planet: location.planetId
        ? PLANET_LABELS[location.planetId]
        : undefined,
      stats:
        actionLabels.length > 0
          ? { "Field Actions": actionLabels.join(", ") }
          : location.isMainSettlement
            ? { "P2P Tax": "8%" }
            : layer === "Spaceport"
              ? { "P2P Tax": "2%" }
              : undefined,
      sourceDoc: "main-game.ts",
    };
  });
}

const TRAVEL_REFERENCE: CodexEntry = {
  id: "location-travel-rules",
  category: "locations",
  name: "Travel Timers (Locked)",
  subtitle: "Navigation · Verdant Rim",
  description:
    "Base travel durations from the handoff brief. Navigation skill reduces timers.",
  tags: ["navigation", "travel", "reference"],
  locationLayer: "Reference",
  stats: {
    "Orbit ↔ Surface": "60 sec",
    "Same-planet settlement ↔ settlement": "120 sec",
    "Tutorial depart": "15 sec",
  },
  sourceDoc: HANDOFF,
};

export const LOCATION_ENTRIES: CodexEntry[] = [
  ...gameLocationEntries(),
  ...miningLocationEntries(),
  TRAVEL_REFERENCE,
];
