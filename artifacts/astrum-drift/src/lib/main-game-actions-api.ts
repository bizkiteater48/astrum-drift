import { customFetch } from "@workspace/api-client-react";
import type { MainGameActionId, MainGameLocationId } from "./main-game";
import type { SkillId } from "./main-game";

export type MainGameActionCompleteResult = {
  actionId: MainGameActionId;
  tutorialInventory: Record<string, number>;
  skillXp: Record<SkillId, number>;
  progressVersion: number;
  silverCoins: number;
  credits: number;
};

export function completeMainGameAction(
  actionId: MainGameActionId,
  locationId: MainGameLocationId,
) {
  return customFetch<MainGameActionCompleteResult>(
    "/api/players/main-game/actions/complete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, locationId }),
    },
  );
}
