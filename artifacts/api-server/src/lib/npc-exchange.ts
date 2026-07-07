/** Spaceports where the NPC vendor buys materials at floor prices. */
export const NPC_EXCHANGE_LOCATION_IDS = new Set(["outpost_one_spaceport"]);

export function isNpcExchangeLocationId(locationId: string): boolean {
  return NPC_EXCHANGE_LOCATION_IDS.has(locationId);
}
