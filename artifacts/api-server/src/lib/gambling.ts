export const HOUSE_MIN_STAKE = 1;
export const HOUSE_MAX_STAKE = 100;
export const PVP_MIN_STAKE = 1;
export const PVP_MAX_STAKE = 500;
export const MINT_MAX_PER_REQUEST = 100;
export const CHALLENGE_EXPIRY_MS = 120_000;

export type ReactorDiceChoice = "over" | "under";
export type WarpFlipChoice = "heads" | "tails";
export type HouseGameId = "reactor_dice" | "warp_flip";

export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

export function flipCoin(): WarpFlipChoice {
  return Math.random() < 0.5 ? "heads" : "tails";
}

export function resolveReactorDice(
  roll: number,
  choice: ReactorDiceChoice,
  stake: number,
) {
  if (roll === 50) {
    return { won: false, push: true, payout: stake, roll };
  }

  const won = choice === "over" ? roll > 50 : roll < 50;
  return {
    won,
    push: false,
    payout: won ? stake * 2 : 0,
    roll,
  };
}

export function resolveWarpFlip(
  result: WarpFlipChoice,
  choice: WarpFlipChoice,
  stake: number,
) {
  const won = result === choice;
  return {
    won,
    payout: won ? stake * 2 : 0,
    result,
  };
}

export function isChallengeExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > CHALLENGE_EXPIRY_MS;
}
