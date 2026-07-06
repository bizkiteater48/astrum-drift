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

export type PokerPhase =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type PokerActionType = "fold" | "check" | "call" | "raise";

export type PokerTableState = {
  board: string[];
  holeCards: Record<string, string[] | null>;
  stacks: Record<string, number>;
  pot: number;
  phase: PokerPhase;
  streetBets: Record<string, number>;
  currentBet: number;
  actionOn: number;
  buttonPlayerId: number;
  smallBlind: number;
  bigBlind: number;
  actions: Array<{ playerId: number; action: PokerActionType; amount?: number }>;
  winnerId?: number;
  winReason?: "fold" | "showdown";
  winningHand?: string;
  legalActions: PokerActionType[];
  callAmount: number;
  minRaiseTotal: number;
  actionDeadlineAt?: string;
  actionTimeoutSeconds?: number;
  secondsRemaining?: number;
};

export type PokerGame = {
  id: number;
  inviterId: number;
  opponentId: number;
  inviterUsername: string;
  opponentUsername: string;
  buyIn: number;
  status: "invited" | "active" | "complete" | "declined" | "expired";
  winnerId: number | null;
  createdAt: string;
  resolvedAt: string | null;
  isIncoming: boolean;
  isOutgoing: boolean;
  state: PokerTableState | null;
};

export function listPokerGames() {
  return customFetch<{ games: PokerGame[] }>("/api/gambling/poker/games", {
    method: "GET",
  });
}

export function createPokerInvite(body: {
  opponentUsername: string;
  buyIn: number;
}) {
  return customFetch<{ game: PokerGame }>("/api/gambling/poker/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function acceptPokerInvite(gameId: number) {
  return customFetch<{ player: Player; game: PokerGame }>(
    `/api/gambling/poker/invites/${gameId}/accept`,
    { method: "POST" },
  );
}

export function declinePokerInvite(gameId: number) {
  return customFetch<{ ok: boolean }>(
    `/api/gambling/poker/invites/${gameId}/decline`,
    { method: "POST" },
  );
}

export function submitPokerAction(
  gameId: number,
  body: { action: PokerActionType; raiseTotal?: number },
) {
  return customFetch<{ player: Player; game: PokerGame }>(
    `/api/gambling/poker/games/${gameId}/action`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}
