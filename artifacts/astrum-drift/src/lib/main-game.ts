export type MainGameLocationId =
  | "outpost_one_spaceport"
  | "scrap_fields"
  | "verdant_bio_fields"
  | "outpost_vendor";

export type MainGameImageKey =
  | "spaceport"
  | "wreck_site"
  | "bio_dome"
  | "outpost_shop";

export type MainGameActionId =
  | "salvage_scrap_field"
  | "harvest_fiber_field"
  | "sell_scrap_metal";

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

export type MainGameLocation = {
  id: MainGameLocationId;
  name: string;
  systemName: string;
  imageKey: MainGameImageKey;
  actions: MainGameAction[];
  travelDestinations: MainGameTravelLink[];
};

export const MAIN_GAME_START_LOCATION: MainGameLocationId =
  "outpost_one_spaceport";

export const MAIN_GAME_DIRECTIVE =
  "Explore the Verdant Rim. Travel from the Location panel, run field operations, and use Star Chart to review area maps.";

export const MAIN_GAME_LOCATIONS: Record<
  MainGameLocationId,
  MainGameLocation
> = {
  outpost_one_spaceport: {
    id: "outpost_one_spaceport",
    name: "Spaceport",
    systemName: "Outpost One · Verdant Rim",
    imageKey: "spaceport",
    actions: [],
    travelDestinations: [
      {
        locationId: "scrap_fields",
        label: "Scrap Fields",
        timerSec: 15,
      },
      {
        locationId: "verdant_bio_fields",
        label: "Verdant Bio Fields",
        timerSec: 15,
      },
      {
        locationId: "outpost_vendor",
        label: "Outpost Vendor",
        timerSec: 10,
      },
    ],
  },
  scrap_fields: {
    id: "scrap_fields",
    name: "Scrap Fields",
    systemName: "Outpost One · Verdant Rim",
    imageKey: "wreck_site",
    actions: [
      {
        id: "salvage_scrap_field",
        label: "Salvage Scrap",
        skill: "Salvaging",
        timerSec: 15,
        requiredHandItem: "Basic Salvage Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "outpost_one_spaceport",
        label: "Spaceport",
        timerSec: 15,
      },
      {
        locationId: "verdant_bio_fields",
        label: "Verdant Bio Fields",
        timerSec: 20,
      },
      {
        locationId: "outpost_vendor",
        label: "Outpost Vendor",
        timerSec: 12,
      },
    ],
  },
  verdant_bio_fields: {
    id: "verdant_bio_fields",
    name: "Verdant Bio Fields",
    systemName: "Outpost One · Verdant Rim",
    imageKey: "bio_dome",
    actions: [
      {
        id: "harvest_fiber_field",
        label: "Harvest Fiberleaf",
        skill: "Harvesting",
        timerSec: 15,
        requiredHandItem: "Basic Harvesting Tool",
      },
    ],
    travelDestinations: [
      {
        locationId: "outpost_one_spaceport",
        label: "Spaceport",
        timerSec: 15,
      },
      {
        locationId: "scrap_fields",
        label: "Scrap Fields",
        timerSec: 20,
      },
      {
        locationId: "outpost_vendor",
        label: "Outpost Vendor",
        timerSec: 12,
      },
    ],
  },
  outpost_vendor: {
    id: "outpost_vendor",
    name: "Outpost Vendor",
    systemName: "Outpost One · Verdant Rim",
    imageKey: "outpost_shop",
    actions: [
      {
        id: "sell_scrap_metal",
        label: "Sell Scrap Metal",
        skill: "Trading",
        timerSec: 0,
      },
    ],
    travelDestinations: [
      {
        locationId: "outpost_one_spaceport",
        label: "Spaceport",
        timerSec: 10,
      },
      {
        locationId: "scrap_fields",
        label: "Scrap Fields",
        timerSec: 12,
      },
      {
        locationId: "verdant_bio_fields",
        label: "Verdant Bio Fields",
        timerSec: 12,
      },
    ],
  },
};

export function getMainGameLocation(
  locationId: MainGameLocationId,
): MainGameLocation {
  return MAIN_GAME_LOCATIONS[locationId];
}

export function listMainGameLocations(): MainGameLocation[] {
  return Object.values(MAIN_GAME_LOCATIONS);
}
