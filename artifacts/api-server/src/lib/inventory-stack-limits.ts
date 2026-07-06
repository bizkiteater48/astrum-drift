/** Default stack size for ores, bars, salvage, harvest, and ammo cartridges. */
export const MAIN_GAME_INVENTORY_STACK_LIMIT_DEFAULT = 1000;

/** Stack size for rare mining gems. */
export const MAIN_GAME_INVENTORY_STACK_LIMIT_RARE_GEM = 100;

const RARE_GEM_ITEMS = new Set([
  "Clouded Garnet",
  "Pale Sapphire",
  "Bright Emerald",
  "Ember Ruby",
  "Star Opal",
  "Azure Topaz",
  "Royal Amethyst",
  "Astral Diamond",
  "Luminous Pearl",
  "Shadow Onyx",
  "Celestial Prism",
  "Void Pearl",
]);

export function getItemStackLimit(itemName: string): number {
  if (RARE_GEM_ITEMS.has(itemName)) {
    return MAIN_GAME_INVENTORY_STACK_LIMIT_RARE_GEM;
  }

  return MAIN_GAME_INVENTORY_STACK_LIMIT_DEFAULT;
}
