import { wouldExceedInventoryCapacity } from "./main-game-inventory";

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

const GATHERING_ACTION_IDS = new Set<MainGameActionId>([
  "mine_copper_vein",
  "mine_silver_vein",
  "mine_nickel_deposit",
  "harvest_fiberleaf",
  "salvage_wreck_flats",
  "salvage_hulk_yard",
]);

const PRODUCTION_ACTION_IDS = new Set<MainGameActionId>([
  "fabricate_bronze_bar",
  "fabricate_iron_bar",
  "fabricate_silver_coins",
]);

export const MAIN_GAME_ACTION_LOCATIONS: Record<
  MainGameActionId,
  readonly string[]
> = {
  mine_copper_vein: ["copper_flats"],
  fabricate_bronze_bar: ["brassworks_yard"],
  fabricate_iron_bar: ["brassworks_yard"],
  fabricate_silver_coins: [
    "outpost_one_spaceport",
    "tidecrest",
    "silver_shallows",
  ],
  harvest_fiberleaf: ["spore_fen"],
  salvage_wreck_flats: ["wreck_flats"],
  salvage_hulk_yard: ["hulk_yard"],
  craft_energy_cartridge: ["tech_annex"],
  mine_silver_vein: ["silver_shallows"],
  combat_balanced_enemy: ["drift_arena"],
  turn_in_beacon_request: ["beacon_relay"],
  mine_nickel_deposit: ["nickel_rift"],
  combat_dangerous_enemy: ["hunters_ring"],
};

const ACTION_REQUIRED_HAND: Partial<Record<MainGameActionId, string>> = {
  mine_copper_vein: "Basic Mining Tool",
  mine_silver_vein: "Basic Mining Tool",
  mine_nickel_deposit: "Basic Mining Tool",
  harvest_fiberleaf: "Basic Harvesting Tool",
  salvage_wreck_flats: "Basic Salvage Tool",
  salvage_hulk_yard: "Basic Salvage Tool",
  fabricate_bronze_bar: "Basic Mining Tool",
  fabricate_iron_bar: "Basic Mining Tool",
};

export function parseMainGameActionId(raw: unknown): MainGameActionId | null {
  if (typeof raw !== "string") return null;
  return raw in MAIN_GAME_ACTION_LOCATIONS ? (raw as MainGameActionId) : null;
}

export function isActionAllowedAtLocation(
  actionId: MainGameActionId,
  locationId: string,
): boolean {
  return MAIN_GAME_ACTION_LOCATIONS[actionId]?.includes(locationId) ?? false;
}

export function getEquippedHandItem(
  equippedGear: unknown,
): string | null {
  if (!equippedGear || typeof equippedGear !== "object" || Array.isArray(equippedGear)) {
    return null;
  }

  const hand = (equippedGear as Record<string, unknown>).Hand;
  return typeof hand === "string" && hand.length > 0 ? hand : null;
}

export function getRequiredHandItem(
  actionId: MainGameActionId,
): string | null {
  return ACTION_REQUIRED_HAND[actionId] ?? null;
}

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

function isProductionAction(actionId: MainGameActionId): boolean {
  return PRODUCTION_ACTION_IDS.has(actionId);
}

function isGatheringAction(actionId: MainGameActionId): boolean {
  return GATHERING_ACTION_IDS.has(actionId);
}

function canAffordMainGameAction(
  actionId: MainGameActionId,
  inventory: Record<string, number>,
): boolean {
  const cost = getMainGameActionRecipeCost(actionId);
  return Object.entries(cost).every(
    ([item, qty]) => (inventory[item] ?? 0) >= qty,
  );
}

function isInventoryFullForAction(
  actionId: MainGameActionId,
  inventory: Record<string, number>,
): boolean {
  const rewards = getMainGameActionRewards(actionId);
  if (Object.keys(rewards).length === 0) return false;
  return wouldExceedInventoryCapacity(inventory, rewards);
}

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

  if (isGatheringAction(actionId)) {
    const rewards = getMainGameActionRewards(actionId);
    if (wouldExceedInventoryCapacity(inventory, rewards)) return null;
    const next = { ...inventory };
    for (const [item, qty] of Object.entries(rewards)) {
      next[item] = (next[item] ?? 0) + qty;
    }
    return next;
  }

  return inventory;
}

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

export function readSkillXpFromProgress(
  progress: Record<string, unknown> | null | undefined,
): Record<SkillId, number> {
  const defaults = createDefaultSkillXp();
  const raw = progress?.skillXp;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const source = raw as Record<string, unknown>;
  for (const skill of Object.keys(defaults) as SkillId[]) {
    const value = source[skill];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      defaults[skill] = Math.floor(value);
    }
  }

  return defaults;
}
