const SILVER_COINS_ITEM = "Silver Coins";

export function getInventoryRecord(
  value: unknown,
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, number>) };
}

/** Never reduce item quantities when reconciling two inventory snapshots. */
export function mergeInventoryMonotonic(
  baseInventory: Record<string, number>,
  incomingInventory: Record<string, number>,
): Record<string, number> {
  const merged = { ...baseInventory };

  for (const [itemName, quantity] of Object.entries(incomingInventory)) {
    if (itemName === SILVER_COINS_ITEM) continue;
    if (!Number.isInteger(quantity) || quantity < 0) continue;
    merged[itemName] = Math.max(merged[itemName] ?? 0, quantity);
  }

  return merged;
}

export function getInventoryStackCount(
  inventory: Record<string, number>,
): number {
  return Object.entries(inventory).filter(
    ([itemName, quantity]) =>
      itemName !== "Credits" &&
      itemName !== SILVER_COINS_ITEM &&
      Number.isInteger(quantity) &&
      quantity > 0,
  ).length;
}
