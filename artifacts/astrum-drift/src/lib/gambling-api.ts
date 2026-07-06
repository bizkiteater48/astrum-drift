import { customFetch } from "@workspace/api-client-react";
import type { Player } from "@workspace/api-client-react";

export type HouseGameId = "reactor_dice" | "warp_flip";
export type ReactorDiceChoice = "over" | "under";
export type WarpFlipChoice = "heads" | "tails";

export type GamblingChallenge = {
  id: number;
  challengerId: number;
  opponentId: number;
  challengerUsername: string;
  opponentUsername: string;
  game: string;
  stake: number;
  challengerChoice: string;
  opponentChoice: string;
  status: string;
  createdAt: string;
  isIncoming: boolean;
  isOutgoing: boolean;
};

export type HousePlayOutcome = {
  game: HouseGameId;
  stake: number;
  choice: string;
  won: boolean;
  push: boolean;
  payout: number;
  roll?: number;
  result?: WarpFlipChoice;
};

export function mintSilverCoins(quantity: number) {
  return customFetch<{ player: Player; minted: number }>(
    "/api/gambling/mint-coins",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    },
  );
}

export function playHouseGame(body: {
  game: HouseGameId;
  stake: number;
  choice: ReactorDiceChoice | WarpFlipChoice;
}) {
  return customFetch<{ player: Player; outcome: HousePlayOutcome }>(
    "/api/gambling/house/play",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function listGamblingChallenges() {
  return customFetch<{ challenges: GamblingChallenge[] }>(
    "/api/gambling/challenges",
    { method: "GET" },
  );
}

export function createGamblingChallenge(body: {
  opponentUsername: string;
  stake: number;
  choice: WarpFlipChoice;
}) {
  return customFetch<{ challenge: GamblingChallenge }>(
    "/api/gambling/challenges",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function acceptGamblingChallenge(challengeId: number) {
  return customFetch<{
    player: Player;
    result: {
      challengeId: number;
      flip: WarpFlipChoice;
      winnerId: number;
      winnerUsername: string;
      stake: number;
      payout: number;
      won: boolean;
    };
  }>(`/api/gambling/challenges/${challengeId}/accept`, {
    method: "POST",
  });
}

export function declineGamblingChallenge(challengeId: number) {
  return customFetch<{ ok: boolean }>(
    `/api/gambling/challenges/${challengeId}/decline`,
    { method: "POST" },
  );
}
