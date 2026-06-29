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
  | "spore_fen";

export type MainGameImageKey =
  | "spaceport"
  | "planet_orbit"
  | "settlement_hub"
  | "mining_site"
  | "fabrication_yard"
  | "bio_dome"
  | "harvest_fen";

export type MainGameActionId =
  | "mine_copper_vein"
  | "fabricate_bronze_bar"
  | "fabricate_iron_bar"
  | "harvest_fiberleaf";

export type MainGameAction = {
  id: MainGameActionId;
  label: string;
  skill: string;
  timerSec: number;
  requiredHandItem?: string;
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
  lockedPlanetDepartures?: LockedPlanetDeparture[];
};

/** P2P trade tax stubs — UI wiring deferred to a later phase. */
export const P2P_TRADE_TAX_SPACEPORT = 0.02;
export const P2P_TRADE_TAX_MAIN_SETTLEMENT = 0.08;

export const MAIN_GAME_START_LOCATION: MainGameLocationId =
  "outpost_one_spaceport";

export const TUTORIAL_DEPART_TIMER_SEC = 15;

export const MAIN_GAME_DIRECTIVE =
  "Explore the Verdant Rim. Depart from Outpost One to reach planetary orbit, then travel to surface settlements for field operations. Use Star Chart to review survey maps.";

const LEGACY_LOCATION_MAP: Record<string, MainGameLocationId> = {
  scrap_fields: "copper_flats",
  verdant_bio_fields: "spore_fen",
  outpost_vendor: "aurelia_gate",
  outpost_one_spaceport: "outpost_one_spaceport",
};

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
    actions: [],
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
    ],
    lockedPlanetDepartures: [
      {
        planetId: "scrapreach",
        label: "Scrapreach",
        lockedReason: "Orbital clearance required",
      },
      {
        planetId: "shimmer_coast",
        label: "Shimmer Coast",
        lockedReason: "Orbital clearance required",
      },
      {
        planetId: "obsidian_crown",
        label: "Obsidian Crown",
        lockedReason: "Orbital clearance required",
      },
    ],
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
      {
        locationId: "outpost_one_spaceport",
        label: "Outpost One Main Spaceport",
        timerSec: 15,
      },
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
    systemName: "Aurelia Prime · Verdant Rim",
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
      {
        locationId: "outpost_one_spaceport",
        label: "Outpost One Main Spaceport",
        timerSec: 15,
      },
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
    systemName: "Verdant Mire · Verdant Rim",
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
};

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
