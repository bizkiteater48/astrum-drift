import { getItemStackLimit } from "./inventory-stack-limits";

export type MainGameSystemId = "verdant_rim";

export type MainGameLocationType = "spaceport" | "planet_orbit" | "settlement";

export type MainGamePlanetId =
  | "aurelia_prime"
  | "verdant_mire"
  | "scrapreach"
  | "shimmer_coast"
  | "obsidian_crown";

export type MainGameLocationId =
  | "outpost_one_spaceport"
  | "aurelia_prime_orbit"
  | "aurelia_gate"
  | "copper_flats"
  | "brassworks_yard"
  | "verdant_mire_orbit"
  | "mirehaven"
  | "spore_fen"
  | "scrapreach_orbit"
  | "scrapreach_port"
  | "wreck_flats"
  | "hulk_yard"
  | "tech_annex"
  | "shimmer_coast_orbit"
  | "tidecrest"
  | "silver_shallows"
  | "drift_arena"
  | "beacon_relay"
  | "obsidian_crown_orbit"
  | "crownfall"
  | "nickel_rift"
  | "hunters_ring";

export type MainGameImageKey =
  | "spaceport"
  | "planet_orbit"
  | "settlement_hub"
  | "mining_site"
  | "fabrication_yard"
  | "bio_dome"
  | "harvest_fen"
  | "wreck_site"
  | "combat_arena"
  | "relay_station";

/** Survey art still reuses tutorial placeholders until main-game assets ship. */
export const MAIN_GAME_PLACEHOLDER_IMAGE_KEYS: ReadonlySet<MainGameImageKey> =
  new Set([
    "spaceport",
    "planet_orbit",
    "settlement_hub",
    "mining_site",
    "fabrication_yard",
    "bio_dome",
    "harvest_fen",
    "wreck_site",
    "combat_arena",
    "relay_station",
  ]);

export function isMainGamePlaceholderImage(
  imageKey: MainGameImageKey,
): boolean {
  return MAIN_GAME_PLACEHOLDER_IMAGE_KEYS.has(imageKey);
}

export type MainGameActionId =
  | "mine_copper_vein"
  | "fabricate_bronze_bar"
  | "fabricate_iron_bar"
  | "fabricate_silver_coins"
  | "harvest_fiberleaf"
  | "salvage_wreck_flats"
  | "salvage_hulk_yard"
  | "craft_energy_cartridge"
  | "mine_silver_vein"
  | "combat_balanced_enemy"
  | "turn_in_beacon_request"
  | "mine_nickel_deposit"
  | "combat_dangerous_enemy";

export type SkillId =
  | "mining"
  | "harvesting"
  | "salvaging"
  | "fabrication"
  | "engineering"
  | "synthesis"
  | "combat"
  | "navigation";

export type MainGameAction = {
  id: MainGameActionId;
  label: string;
  skill: string;
  timerSec: number;
  requiredHandItem?: string;
};

export type LocationHubActionId = "speak_vendor" | "player_market";

export type LocationHubAction = {
  id: LocationHubActionId;
  label: string;
};

export type MainGameTravelLink = {
  locationId: MainGameLocationId;
  label: string;
  timerSec: number;
};

export type LockedPlanetDeparture = {
  planetId: MainGamePlanetId;
  label: string;
  lockedReason: string;
};

export type MainGameLocation = {
  id: MainGameLocationId;
  name: string;
  systemName: string;
  systemId: MainGameSystemId;
  locationType: MainGameLocationType;
  planetId?: MainGamePlanetId;
  isMainSettlement?: boolean;
  imageKey: MainGameImageKey;
  actions: MainGameAction[];
  travelDestinations: MainGameTravelLink[];
  /** Phase B: gating disabled for testing — re-enable lockedPlanetDepartures when skill checks are live. */
  lockedPlanetDepartures?: LockedPlanetDeparture[];
};

/** P2P trade tax stubs — settlement markets charge higher than the spaceport hub. */
export const P2P_TRADE_TAX_SPACEPORT = 0.02;
export const P2P_TRADE_TAX_MAIN_SETTLEMENT = 0.08;

export const MAIN_GAME_START_LOCATION: MainGameLocationId =
  "outpost_one_spaceport";

/** Shortened timers while building the main game — restore per-action values before release. */
export const MAIN_GAME_BUILD_TIMER_SEC = 5;

export const TUTORIAL_DEPART_TIMER_SEC = MAIN_GAME_BUILD_TIMER_SEC;

export function getEffectiveBuildTimer(designedTimerSec: number): number {
  if (designedTimerSec <= 0) return designedTimerSec;
  return MAIN_GAME_BUILD_TIMER_SEC;
}

export const MAIN_GAME_DIRECTIVE =
  "Explore the Verdant Rim. Depart from Outpost One to reach planetary orbit, then travel to surface settlements for field operations. Use Star Chart to review survey maps.";

export const MAIN_GAME_SKILLS: { id: SkillId; label: string }[] = [
  { id: "mining", label: "Mining" },
  { id: "harvesting", label: "Harvesting" },
  { id: "salvaging", label: "Salvaging" },
  { id: "fabrication", label: "Fabrication" },
  { id: "engineering", label: "Engineering" },
  { id: "synthesis", label: "Synthesis" },
  { id: "combat", label: "Combat" },
  { id: "navigation", label: "Navigation" },
];

export const MATERIAL_INVENTORY_GROUPS = {
  Ores: [
    "Copper Ore",
    "Tin Ore",
    "Iron Ore",
    "Silver Ore",
    "Nickel Ore",
  ],
  Bars: ["Bronze Bar", "Iron Bar", "Refined Iron"],
  Harvest: ["Fiberleaf", "Bio Fiber", "Basic Chemical"],
  Salvage: [
    "Scrap Metal",
    "Wire Bundle",
    "Armor Plating",
    "Circuit",
    "Damaged Scrap",
    "Salvage Parts",
  ],
} as const;

const LEGACY_LOCATION_MAP: Record<string, MainGameLocationId> = {
  scrap_fields: "copper_flats",
  verdant_bio_fields: "spore_fen",
  outpost_vendor: "aurelia_gate",
  outpost_one_spaceport: "outpost_one_spaceport",
  scrapreach: "scrapreach_orbit",
  shimmer_coast: "shimmer_coast_orbit",
  obsidian_crown: "obsidian_crown_orbit",
};

const ORBIT_TRAVEL_LINKS: MainGameTravelLink[] = [
  {
    locationId: "outpost_one_spaceport",
    label: "Outpost One Main Spaceport",
    timerSec: 15,
  },
];

export const MAIN_GAME_LOCATIONS: Record<
  MainGameLocationId,
  MainGameLocation
> = {
  outpost_one_spaceport: {
    id: "outpost_one_spaceport",
    name: "Main Spaceport",
    systemName: "Outpost One Orbital Station · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "spaceport",
    imageKey: "spaceport",
    actions: [
      {
        id: "fabricate_silver_coins",
        label: "Mint Silver Coins",
        skill: "Fabrication",
        timerSec: 10,
      },
    ],
    travelDestinations: [
      {
        locationId: "aurelia_prime_orbit",
        label: "Aurelia Prime",
        timerSec: 15,
      },
      {
        locationId: "verdant_mire_orbit",
        label: "Verdant Mire",
        timerSec: 15,
      },
      {
        locationId: "scrapreach_orbit",
        label: "Scrapreach",
        timerSec: 15,
      },
      {
        locationId: "shimmer_coast_orbit",
        label: "Shimmer Coast",
        timerSec: 15,
      },
      {
        locationId: "obsidian_crown_orbit",
        label: "Obsidian Crown",
        timerSec: 15,
      },
    ],
    // Phase B: all planets unlocked for testing.
    // To re-enable gating, restore lockedPlanetDepartures and remove III–V from travelDestinations above.
  },
  aurelia_prime_orbit: {
    id: "aurelia_prime_orbit",
    name: "Aurelia Prime",
    systemName: "Planet I · Industrial · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "planet_orbit",
    planetId: "aurelia_prime",
    imageKey: "planet_orbit",
    actions: [],
    travelDestinations: [
      ...ORBIT_TRAVEL_LINKS,
      {
        locationId: "aurelia_gate",
        label: "Aurelia Gate",
        timerSec: 10,
      },
      {
        locationId: "copper_flats",
        label: "Copper Flats",
        timerSec: 12,
      },
      {
        locationId: "brassworks_yard",
        label: "Brassworks Yard",
        timerSec: 12,
      },
    ],
  },
  aurelia_gate: {
    id: "aurelia_gate",
    name: "Aurelia Gate",
    systemName: "Aurelia Prime · P2P Trade Hub · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "aurelia_prime",
    isMainSettlement: true,
    imageKey: "settlement_hub",
    actions: [],
    travelDestinations: [
      {
        locationId: "aurelia_prime_orbit",
        label: "Aurelia Prime Orbit",
        timerSec: 10,
      },
    ],
  },
  copper_flats: {
    id: "copper_flats",
    name: "Copper Flats",
    systemName: "Aurelia Prime · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "aurelia_prime",
    imageKey: "mining_site",
    actions: [
      {
        id: "mine_copper_vein",
        label: "Mine Copper Vein",
        skill: "Mining",
        timerSec: 15,
        requiredHandItem: "Basic Mining Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "aurelia_prime_orbit",
        label: "Aurelia Prime Orbit",
        timerSec: 12,
      },
    ],
  },
  brassworks_yard: {
    id: "brassworks_yard",
    name: "Brassworks Yard",
    systemName: "Aurelia Prime · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "aurelia_prime",
    imageKey: "fabrication_yard",
    actions: [
      {
        id: "fabricate_bronze_bar",
        label: "Fabricate Bronze Bar",
        skill: "Fabrication",
        timerSec: 15,
        requiredHandItem: "Basic Mining Tool",
      },
      {
        id: "fabricate_iron_bar",
        label: "Fabricate Iron Bar",
        skill: "Fabrication",
        timerSec: 15,
        requiredHandItem: "Basic Mining Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "aurelia_prime_orbit",
        label: "Aurelia Prime Orbit",
        timerSec: 12,
      },
    ],
  },
  verdant_mire_orbit: {
    id: "verdant_mire_orbit",
    name: "Verdant Mire",
    systemName: "Planet II · Bio · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "planet_orbit",
    planetId: "verdant_mire",
    imageKey: "planet_orbit",
    actions: [],
    travelDestinations: [
      ...ORBIT_TRAVEL_LINKS,
      {
        locationId: "mirehaven",
        label: "Mirehaven",
        timerSec: 10,
      },
      {
        locationId: "spore_fen",
        label: "Spore Fen",
        timerSec: 12,
      },
    ],
  },
  mirehaven: {
    id: "mirehaven",
    name: "Mirehaven",
    systemName: "Verdant Mire · P2P Trade Hub · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "verdant_mire",
    isMainSettlement: true,
    imageKey: "settlement_hub",
    actions: [],
    travelDestinations: [
      {
        locationId: "verdant_mire_orbit",
        label: "Verdant Mire Orbit",
        timerSec: 10,
      },
    ],
  },
  spore_fen: {
    id: "spore_fen",
    name: "Spore Fen",
    systemName: "Verdant Mire · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "verdant_mire",
    imageKey: "harvest_fen",
    actions: [
      {
        id: "harvest_fiberleaf",
        label: "Harvest Fiberleaf",
        skill: "Harvesting",
        timerSec: 15,
        requiredHandItem: "Basic Harvesting Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "verdant_mire_orbit",
        label: "Verdant Mire Orbit",
        timerSec: 12,
      },
    ],
  },
  scrapreach_orbit: {
    id: "scrapreach_orbit",
    name: "Scrapreach",
    systemName: "Planet III · Salvage · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "planet_orbit",
    planetId: "scrapreach",
    imageKey: "planet_orbit",
    actions: [],
    travelDestinations: [
      ...ORBIT_TRAVEL_LINKS,
      {
        locationId: "scrapreach_port",
        label: "Scrapreach Port",
        timerSec: 10,
      },
      {
        locationId: "wreck_flats",
        label: "Wreck Flats",
        timerSec: 12,
      },
      {
        locationId: "hulk_yard",
        label: "Hulk Yard",
        timerSec: 12,
      },
      {
        locationId: "tech_annex",
        label: "Tech Annex",
        timerSec: 12,
      },
    ],
  },
  scrapreach_port: {
    id: "scrapreach_port",
    name: "Scrapreach Port",
    systemName: "Scrapreach · P2P Trade Hub · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "scrapreach",
    isMainSettlement: true,
    imageKey: "settlement_hub",
    actions: [],
    travelDestinations: [
      {
        locationId: "scrapreach_orbit",
        label: "Scrapreach Orbit",
        timerSec: 10,
      },
    ],
  },
  wreck_flats: {
    id: "wreck_flats",
    name: "Wreck Flats",
    systemName: "Scrapreach · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "scrapreach",
    imageKey: "wreck_site",
    actions: [
      {
        id: "salvage_wreck_flats",
        label: "Salvage Scrap Metal & Wire",
        skill: "Salvaging",
        timerSec: 15,
        requiredHandItem: "Basic Salvage Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "scrapreach_orbit",
        label: "Scrapreach Orbit",
        timerSec: 12,
      },
    ],
  },
  hulk_yard: {
    id: "hulk_yard",
    name: "Hulk Yard",
    systemName: "Scrapreach · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "scrapreach",
    imageKey: "wreck_site",
    actions: [
      {
        id: "salvage_hulk_yard",
        label: "Salvage Armor Plating & Circuit",
        skill: "Salvaging",
        timerSec: 18,
        requiredHandItem: "Basic Salvage Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "scrapreach_orbit",
        label: "Scrapreach Orbit",
        timerSec: 12,
      },
    ],
  },
  tech_annex: {
    id: "tech_annex",
    name: "Tech Annex",
    systemName: "Scrapreach · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "scrapreach",
    imageKey: "fabrication_yard",
    actions: [
      {
        id: "craft_energy_cartridge",
        label: "Craft Energy Cartridge",
        skill: "Engineering",
        timerSec: 15,
        requiredHandItem: "Basic Repair Kit",
      },
    ],
    travelDestinations: [
      {
        locationId: "scrapreach_orbit",
        label: "Scrapreach Orbit",
        timerSec: 12,
      },
    ],
  },
  shimmer_coast_orbit: {
    id: "shimmer_coast_orbit",
    name: "Shimmer Coast",
    systemName: "Planet IV · Silver · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "planet_orbit",
    planetId: "shimmer_coast",
    imageKey: "planet_orbit",
    actions: [],
    travelDestinations: [
      ...ORBIT_TRAVEL_LINKS,
      {
        locationId: "tidecrest",
        label: "Tidecrest",
        timerSec: 10,
      },
      {
        locationId: "silver_shallows",
        label: "Silver Shallows",
        timerSec: 12,
      },
      {
        locationId: "drift_arena",
        label: "Drift Arena",
        timerSec: 12,
      },
      {
        locationId: "beacon_relay",
        label: "Beacon Relay",
        timerSec: 12,
      },
    ],
  },
  tidecrest: {
    id: "tidecrest",
    name: "Tidecrest",
    systemName: "Shimmer Coast · P2P Trade Hub · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "shimmer_coast",
    isMainSettlement: true,
    imageKey: "settlement_hub",
    actions: [
      {
        id: "fabricate_silver_coins",
        label: "Mint Silver Coins",
        skill: "Fabrication",
        timerSec: 10,
      },
    ],
    travelDestinations: [
      {
        locationId: "shimmer_coast_orbit",
        label: "Shimmer Coast Orbit",
        timerSec: 10,
      },
    ],
  },
  silver_shallows: {
    id: "silver_shallows",
    name: "Silver Shallows",
    systemName: "Shimmer Coast · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "shimmer_coast",
    imageKey: "mining_site",
    actions: [
      {
        id: "mine_silver_vein",
        label: "Mine Silver Vein",
        skill: "Mining",
        timerSec: 18,
        requiredHandItem: "Basic Mining Tool",
      },
      {
        id: "fabricate_silver_coins",
        label: "Mint Silver Coins",
        skill: "Fabrication",
        timerSec: 10,
      },
    ],
    travelDestinations: [
      {
        locationId: "shimmer_coast_orbit",
        label: "Shimmer Coast Orbit",
        timerSec: 12,
      },
    ],
  },
  drift_arena: {
    id: "drift_arena",
    name: "Drift Arena",
    systemName: "Shimmer Coast · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "shimmer_coast",
    imageKey: "combat_arena",
    actions: [
      {
        id: "combat_balanced_enemy",
        label: "Engage Balanced Opponent",
        skill: "Combat",
        timerSec: 20,
        requiredHandItem: "Basic Weapon",
      },
    ],
    travelDestinations: [
      {
        locationId: "shimmer_coast_orbit",
        label: "Shimmer Coast Orbit",
        timerSec: 12,
      },
    ],
  },
  beacon_relay: {
    id: "beacon_relay",
    name: "Beacon Relay",
    systemName: "Shimmer Coast · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "shimmer_coast",
    imageKey: "relay_station",
    actions: [
      {
        id: "turn_in_beacon_request",
        label: "Submit Navigation Request",
        skill: "Navigation",
        timerSec: 10,
      },
    ],
    travelDestinations: [
      {
        locationId: "shimmer_coast_orbit",
        label: "Shimmer Coast Orbit",
        timerSec: 12,
      },
    ],
  },
  obsidian_crown_orbit: {
    id: "obsidian_crown_orbit",
    name: "Obsidian Crown",
    systemName: "Planet V · Frontier · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "planet_orbit",
    planetId: "obsidian_crown",
    imageKey: "planet_orbit",
    actions: [],
    travelDestinations: [
      ...ORBIT_TRAVEL_LINKS,
      {
        locationId: "crownfall",
        label: "Crownfall",
        timerSec: 10,
      },
      {
        locationId: "nickel_rift",
        label: "Nickel Rift",
        timerSec: 12,
      },
      {
        locationId: "hunters_ring",
        label: "Hunter's Ring",
        timerSec: 12,
      },
    ],
  },
  crownfall: {
    id: "crownfall",
    name: "Crownfall",
    systemName: "Obsidian Crown · P2P Trade Hub · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "obsidian_crown",
    isMainSettlement: true,
    imageKey: "settlement_hub",
    actions: [],
    travelDestinations: [
      {
        locationId: "obsidian_crown_orbit",
        label: "Obsidian Crown Orbit",
        timerSec: 10,
      },
    ],
  },
  nickel_rift: {
    id: "nickel_rift",
    name: "Nickel Rift",
    systemName: "Obsidian Crown · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "obsidian_crown",
    imageKey: "mining_site",
    actions: [
      {
        id: "mine_nickel_deposit",
        label: "Mine Nickel Deposit",
        skill: "Mining",
        timerSec: 20,
        requiredHandItem: "Basic Mining Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "obsidian_crown_orbit",
        label: "Obsidian Crown Orbit",
        timerSec: 12,
      },
    ],
  },
  hunters_ring: {
    id: "hunters_ring",
    name: "Hunter's Ring",
    systemName: "Obsidian Crown · Verdant Rim",
    systemId: "verdant_rim",
    locationType: "settlement",
    planetId: "obsidian_crown",
    imageKey: "combat_arena",
    actions: [
      {
        id: "combat_dangerous_enemy",
        label: "Engage Dangerous Hostile",
        skill: "Combat",
        timerSec: 25,
        requiredHandItem: "Basic Weapon",
      },
    ],
    travelDestinations: [
      {
        locationId: "obsidian_crown_orbit",
        label: "Obsidian Crown Orbit",
        timerSec: 12,
      },
    ],
  },
};

/** Early workbook XP awards for completed field actions. */
export function getActionSkillXp(
  actionId: MainGameActionId,
): { skill: SkillId; xp: number } | null {
  switch (actionId) {
    case "mine_copper_vein":
      return { skill: "mining", xp: 5 };
    case "mine_silver_vein":
      return { skill: "mining", xp: 8 };
    case "mine_nickel_deposit":
      return { skill: "mining", xp: 10 };
    case "harvest_fiberleaf":
      return { skill: "harvesting", xp: 5 };
    case "salvage_wreck_flats":
      return { skill: "salvaging", xp: 5 };
    case "salvage_hulk_yard":
      return { skill: "salvaging", xp: 15 };
    case "fabricate_bronze_bar":
    case "fabricate_iron_bar":
    case "fabricate_silver_coins":
      return { skill: "fabrication", xp: 8 };
    case "craft_energy_cartridge":
      return { skill: "engineering", xp: 5 };
    case "combat_balanced_enemy":
      return { skill: "combat", xp: 10 };
    case "combat_dangerous_enemy":
      return { skill: "combat", xp: 18 };
    case "turn_in_beacon_request":
      return { skill: "navigation", xp: 8 };
    default:
      return null;
  }
}

export function createDefaultSkillXp(): Record<SkillId, number> {
  return {
    mining: 0,
    harvesting: 0,
    salvaging: 0,
    fabrication: 0,
    engineering: 0,
    synthesis: 0,
    combat: 0,
    navigation: 0,
  };
}

export function isMarketLocation(location: MainGameLocation): boolean {
  return (
    location.locationType === "spaceport" || location.isMainSettlement === true
  );
}

export function isStationStorageLocation(location: MainGameLocation): boolean {
  return location.locationType === "spaceport";
}

export function isNpcExchangeLocation(location: MainGameLocation): boolean {
  return location.locationType === "spaceport";
}

export function getLocationHubActions(
  location: MainGameLocation,
): LocationHubAction[] {
  const actions: LocationHubAction[] = [];
  if (isNpcExchangeLocation(location)) {
    actions.push({ id: "speak_vendor", label: "Speak to the Vendor" });
  }
  if (isMarketLocation(location)) {
    actions.push({ id: "player_market", label: "Market" });
  }
  return actions;
}

export function getMarketTaxRate(location: MainGameLocation): number {
  return location.locationType === "spaceport"
    ? P2P_TRADE_TAX_SPACEPORT
    : P2P_TRADE_TAX_MAIN_SETTLEMENT;
}

export function formatMarketTaxRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function normalizeMainGameLocationId(
  locationId: string | undefined,
): MainGameLocationId {
  if (!locationId) return MAIN_GAME_START_LOCATION;

  if (locationId in MAIN_GAME_LOCATIONS) {
    return locationId as MainGameLocationId;
  }

  return LEGACY_LOCATION_MAP[locationId] ?? MAIN_GAME_START_LOCATION;
}

export function getMainGameLocation(
  locationId: MainGameLocationId,
): MainGameLocation {
  return MAIN_GAME_LOCATIONS[locationId];
}

export function listMainGameLocations(): MainGameLocation[] {
  return Object.values(MAIN_GAME_LOCATIONS);
}

/** Star Chart entries — survey maps for orbital zones and surface settlements. */
export function listStarChartLocations(): MainGameLocation[] {
  return listMainGameLocations().filter(
    (location) => location.locationType !== "spaceport",
  );
}

const STAR_CHART_PLANET_ORDER: MainGamePlanetId[] = [
  "aurelia_prime",
  "verdant_mire",
  "scrapreach",
  "shimmer_coast",
  "obsidian_crown",
];

const STAR_CHART_SYSTEM_META: Record<
  MainGameSystemId,
  { name: string; description: string }
> = {
  verdant_rim: {
    name: "Verdant Rim",
    description:
      "Five-planet frontier system anchored by Outpost One orbital station.",
  },
};

export type StarChartSystem = {
  id: MainGameSystemId;
  name: string;
  description: string;
  planetCount: number;
};

export type StarChartPlanet = {
  id: MainGamePlanetId;
  name: string;
  subtitle: string;
  orbitLocationId: MainGameLocationId;
};

export type StarChartSystemDetail = {
  system: StarChartSystem;
  spaceport: MainGameLocation;
  planets: StarChartPlanet[];
};

export type StarChartSettlement = {
  location: MainGameLocation;
  actions: MainGameAction[];
};

export type StarChartPlanetDetail = {
  planet: StarChartPlanet;
  settlements: StarChartSettlement[];
};

function getPlanetSubtitle(orbitLocation: MainGameLocation): string {
  return orbitLocation.systemName.replace(/ · Verdant Rim$/, "");
}

export function listStarChartSystems(): StarChartSystem[] {
  const systemIds = new Set(
    listMainGameLocations().map((location) => location.systemId),
  );

  return Array.from(systemIds).map((systemId) => {
    const meta = STAR_CHART_SYSTEM_META[systemId];
    const planetCount = listMainGameLocations().filter(
      (location) =>
        location.systemId === systemId &&
        location.locationType === "planet_orbit",
    ).length;

    return {
      id: systemId,
      name: meta.name,
      description: meta.description,
      planetCount,
    };
  });
}

export function getStarChartSystemDetail(
  systemId: MainGameSystemId,
): StarChartSystemDetail {
  const locations = listMainGameLocations().filter(
    (location) => location.systemId === systemId,
  );
  const spaceport = locations.find(
    (location) => location.locationType === "spaceport",
  );
  if (!spaceport) {
    throw new Error(`Star chart system missing spaceport: ${systemId}`);
  }

  const orbitByPlanet = new Map(
    locations
      .filter(
        (location): location is MainGameLocation & { planetId: MainGamePlanetId } =>
          location.locationType === "planet_orbit" && !!location.planetId,
      )
      .map((location) => [location.planetId, location]),
  );

  const planets = STAR_CHART_PLANET_ORDER.filter((planetId) =>
    orbitByPlanet.has(planetId),
  ).map((planetId) => {
    const orbit = orbitByPlanet.get(planetId)!;
    return {
      id: planetId,
      name: orbit.name,
      subtitle: getPlanetSubtitle(orbit),
      orbitLocationId: orbit.id,
    };
  });

  return {
    system: listStarChartSystems().find((system) => system.id === systemId)!,
    spaceport,
    planets,
  };
}

export function getStarChartPlanetDetail(
  planetId: MainGamePlanetId,
): StarChartPlanetDetail {
  const orbit = listMainGameLocations().find(
    (location) =>
      location.locationType === "planet_orbit" && location.planetId === planetId,
  );
  if (!orbit?.planetId) {
    throw new Error(`Star chart planet missing orbit: ${planetId}`);
  }

  const planet: StarChartPlanet = {
    id: planetId,
    name: orbit.name,
    subtitle: getPlanetSubtitle(orbit),
    orbitLocationId: orbit.id,
  };

  const settlements = listMainGameLocations()
    .filter(
      (location) =>
        location.locationType === "settlement" && location.planetId === planetId,
    )
    .map((location) => ({
      location,
      actions: location.actions,
    }));

  return { planet, settlements };
}

export function getStarChartContextForLocation(
  locationId: MainGameLocationId,
): {
  systemId: MainGameSystemId;
  planetId?: MainGamePlanetId;
} {
  const location = getMainGameLocation(locationId);
  return {
    systemId: location.systemId,
    planetId: location.planetId,
  };
}

/** Phase B inventory cap — distinct item stacks (Credits excluded). */
export const MAIN_GAME_INVENTORY_SLOT_LIMIT = 50;

export {
  getItemStackLimit,
  MAIN_GAME_INVENTORY_STACK_LIMIT,
  MAIN_GAME_INVENTORY_STACK_LIMIT_DEFAULT,
  MAIN_GAME_INVENTORY_STACK_LIMIT_RARE_GEM,
} from "./inventory-stack-limits";

const GATHERING_ACTION_IDS: MainGameActionId[] = [
  "mine_copper_vein",
  "mine_silver_vein",
  "mine_nickel_deposit",
  "harvest_fiberleaf",
  "salvage_wreck_flats",
  "salvage_hulk_yard",
];

const PRODUCTION_ACTION_IDS: MainGameActionId[] = [
  "fabricate_bronze_bar",
  "fabricate_iron_bar",
  "fabricate_silver_coins",
];

export function isGatheringAction(actionId: MainGameActionId): boolean {
  return GATHERING_ACTION_IDS.includes(actionId);
}

export function isProductionAction(actionId: MainGameActionId): boolean {
  return PRODUCTION_ACTION_IDS.includes(actionId);
}

export function isAutoLoopEligibleAction(actionId: MainGameActionId): boolean {
  return isGatheringAction(actionId) || isProductionAction(actionId);
}

export function getInventoryStackCount(
  inventory: Record<string, number>,
): number {
  return Object.entries(inventory).filter(
    ([key, qty]) => key !== "Credits" && qty > 0,
  ).length;
}

/** Items gained when an action completes successfully. */
export function getMainGameActionRewards(
  actionId: MainGameActionId,
): Record<string, number> {
  switch (actionId) {
    case "mine_copper_vein":
      return { "Copper Ore": 1 };
    case "mine_silver_vein":
      return { "Silver Ore": 1 };
    case "mine_nickel_deposit":
      return { "Nickel Ore": 1 };
    case "harvest_fiberleaf":
      return { Fiberleaf: 1 };
    case "salvage_wreck_flats":
      return { "Scrap Metal": 1, "Wire Bundle": 1 };
    case "salvage_hulk_yard":
      return { "Armor Plating": 1, Circuit: 1 };
    case "fabricate_bronze_bar":
      return { "Bronze Bar": 1 };
    case "fabricate_iron_bar":
      return { "Iron Bar": 1 };
    case "fabricate_silver_coins":
      return {};
    default:
      return {};
  }
}

/** Ingredients consumed when a production action completes. */
export function getMainGameActionRecipeCost(
  actionId: MainGameActionId,
): Record<string, number> {
  switch (actionId) {
    case "fabricate_bronze_bar":
      return { "Copper Ore": 1, "Tin Ore": 1 };
    case "fabricate_iron_bar":
      return { "Iron Ore": 1 };
    case "fabricate_silver_coins":
      return { "Silver Ore": 1 };
    default:
      return {};
  }
}

export function canAffordMainGameAction(
  actionId: MainGameActionId,
  inventory: Record<string, number>,
): boolean {
  const cost = getMainGameActionRecipeCost(actionId);
  return Object.entries(cost).every(
    ([item, qty]) => (inventory[item] ?? 0) >= qty,
  );
}

export function wouldExceedInventoryCapacity(
  inventory: Record<string, number>,
  rewardItems: Record<string, number>,
): boolean {
  for (const [item, qty] of Object.entries(rewardItems)) {
    if (qty <= 0) continue;
    const current = inventory[item] ?? 0;
    if (current + qty > getItemStackLimit(item)) return true;
  }

  const newStackCount = Object.entries(rewardItems).filter(
    ([item, qty]) => qty > 0 && (inventory[item] ?? 0) === 0,
  ).length;

  if (newStackCount === 0) return false;

  return (
    getInventoryStackCount(inventory) + newStackCount >
    MAIN_GAME_INVENTORY_SLOT_LIMIT
  );
}

export function isInventoryFullForAction(
  actionId: MainGameActionId,
  inventory: Record<string, number>,
): boolean {
  const rewards = getMainGameActionRewards(actionId);
  if (Object.keys(rewards).length === 0) return false;
  return wouldExceedInventoryCapacity(inventory, rewards);
}

/** Apply a completed main-game action to inventory (pure). Returns null if unaffordable. */
export function applyMainGameActionInventory(
  actionId: MainGameActionId,
  inventory: Record<string, number>,
): Record<string, number> | null {
  if (isProductionAction(actionId)) {
    if (!canAffordMainGameAction(actionId, inventory)) return null;
    const cost = getMainGameActionRecipeCost(actionId);
    const rewards = getMainGameActionRewards(actionId);
    const next = { ...inventory };
    for (const [item, qty] of Object.entries(cost)) {
      next[item] = (next[item] ?? 0) - qty;
      if (next[item] <= 0) delete next[item];
    }
    for (const [item, qty] of Object.entries(rewards)) {
      next[item] = (next[item] ?? 0) + qty;
    }
    return next;
  }

  const rewards = getMainGameActionRewards(actionId);
  if (Object.keys(rewards).length === 0) return inventory;
  if (wouldExceedInventoryCapacity(inventory, rewards)) return null;

  const next = { ...inventory };
  for (const [item, qty] of Object.entries(rewards)) {
    next[item] = (next[item] ?? 0) + qty;
  }
  return next;
}
