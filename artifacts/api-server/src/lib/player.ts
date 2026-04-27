import type { Player } from "@workspace/db";
import { CYCLE_DURATION_SEC, MAX_MINING_QUEUE } from "./constants";

export function serializePlayer(player: Player) {
  return {
    id: player.id,
    username: player.username,
    credits: player.credits,
    experience: player.experience,
    currentLocation: player.currentLocation,
    miningLevel: player.miningLevel,
    miningQueued: player.miningQueued,
    miningStartedAt: player.miningStartedAt
      ? player.miningStartedAt.toISOString()
      : null,
    cycleDurationSec: CYCLE_DURATION_SEC,
    maxQueue: MAX_MINING_QUEUE,
  };
}
