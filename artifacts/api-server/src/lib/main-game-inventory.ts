import { getItemStackLimit } from "./inventory-stack-limits";

/** Phase B personal inventory cap — distinct item stacks (Credits excluded). */
export const MAIN_GAME_INVENTORY_SLOT_LIMIT = 50;

export function getInventoryStackCount(
  inventory: Record<string, number>,
): number {
  return Object.entries(inventory).filter(
    ([key, qty]) => key !== "Credits" && qty > 0,
  ).length;
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
