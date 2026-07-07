import { customFetch } from "@workspace/api-client-react";
import type { MainGameLocationId } from "./main-game";

export type NpcSellResult = {
  tutorialInventory: Record<string, number>;
  creditsEarned: number;
  quantitySold: number;
  item: string;
  progressVersion: number;
};

export function sellNpcItem(
  item: string,
  quantity: number,
  locationId: MainGameLocationId,
) {
  return customFetch<NpcSellResult>("/api/players/npc-sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, quantity, locationId }),
  });
}
