import type { Player } from "@workspace/db";
import { CYCLE_DURATION_SEC } from "./constants";

export function serializePlayer(player: Player) {
  const mutedUntil =
    player.mutedUntil && player.mutedUntil.getTime() > Date.now()
      ? player.mutedUntil.toISOString()
      : null;

  return {
    id: player.id,
    username: player.username,
    role: player.role ?? "player",
    credits: player.credits,
    silverCoins: player.silverCoins ?? 0,
    experience: player.experience,
    currentLocation: player.currentLocation,
    miningLevel: player.miningLevel,
    miningStartedAt: player.miningStartedAt
      ? player.miningStartedAt.toISOString()
      : null,
    cycleDurationSec: CYCLE_DURATION_SEC,
    mutedUntil,
    progressVersion: player.progressVersion ?? 0,
  };
}
