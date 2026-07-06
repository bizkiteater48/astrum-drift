import type { Player } from "@workspace/db";

export const SILVER_COINS_ITEM = "Silver Coins";
export const CREDITS_ITEM = "Credits";

export type TutorialProgressBlob = Record<string, unknown> & {
  tutorialInventory?: Record<string, number>;
  stationStorage?: Record<string, number>;
  progressVersion?: number;
};

export function getInventoryFromProgress(
  progress: TutorialProgressBlob | null | undefined,
): Record<string, number> {
  const inventory = progress?.tutorialInventory;
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return {};
  }

  return { ...inventory };
}

export function getStationStorageFromProgress(
  progress: TutorialProgressBlob | null | undefined,
): Record<string, number> {
  const storage = progress?.stationStorage;
  if (!storage || typeof storage !== "object" || Array.isArray(storage)) {
    return {};
  }

  return { ...storage };
}

export function applyBalanceMirrors(
  inventory: Record<string, number>,
  balances: { credits: number; silverCoins: number },
): Record<string, number> {
  return {
    ...inventory,
    [CREDITS_ITEM]: balances.credits,
    [SILVER_COINS_ITEM]: balances.silverCoins,
  };
}

/** Client saves may not reduce server inventory quantities or override silver coins. */
export function mergeInventoryMonotonic(
  serverInventory: Record<string, number>,
  clientInventory: Record<string, number>,
): Record<string, number> {
  const merged = { ...serverInventory };

  for (const [itemName, quantity] of Object.entries(clientInventory)) {
    if (itemName === SILVER_COINS_ITEM) continue;

    if (!Number.isInteger(quantity) || quantity < 0) continue;

    merged[itemName] = Math.max(merged[itemName] ?? 0, quantity);
  }

  return merged;
}

export type BalanceRepairResult = {
  credits: number;
  silverCoins: number;
  tutorialProgress: TutorialProgressBlob;
  changed: boolean;
};

export function computeBalanceRepair(player: Player): BalanceRepairResult {
  const progress = (player.tutorialProgress as TutorialProgressBlob | null) ?? {};
  const inventory = getInventoryFromProgress(progress);
  const jsonSilver = inventory[SILVER_COINS_ITEM] ?? 0;
  const jsonCredits = inventory[CREDITS_ITEM] ?? 0;

  let credits = player.credits;
  let silverCoins = player.silverCoins ?? 0;
  let changed = false;

  if (jsonSilver > silverCoins) {
    silverCoins = jsonSilver;
    changed = true;
  }

  if (jsonCredits > credits) {
    credits = jsonCredits;
    changed = true;
  }

  const mirroredInventory = applyBalanceMirrors(inventory, { credits, silverCoins });
  const nextProgress: TutorialProgressBlob = {
    ...progress,
    tutorialInventory: mirroredInventory,
  };

  if (
    JSON.stringify(mirroredInventory) !== JSON.stringify(inventory) ||
    JSON.stringify(nextProgress) !== JSON.stringify(progress)
  ) {
    changed = true;
  }

  return {
    credits,
    silverCoins,
    tutorialProgress: nextProgress,
    changed,
  };
}

export function withEconomySnapshot(
  progress: TutorialProgressBlob | null | undefined,
  balances: { credits: number; silverCoins: number },
): TutorialProgressBlob {
  const base = progress ?? {};
  const inventory = getInventoryFromProgress(base);

  return {
    ...base,
    tutorialInventory: applyBalanceMirrors(inventory, balances),
  };
}

export function buildEconomyUpdateFields(
  player: Pick<Player, "credits" | "silverCoins" | "tutorialProgress">,
  balances: { credits?: number; silverCoins?: number },
) {
  const credits = balances.credits ?? player.credits;
  const silverCoins = balances.silverCoins ?? player.silverCoins ?? 0;

  return {
    credits,
    silverCoins,
    tutorialProgress: withEconomySnapshot(
      player.tutorialProgress as TutorialProgressBlob | null,
      { credits, silverCoins },
    ),
  };
}
