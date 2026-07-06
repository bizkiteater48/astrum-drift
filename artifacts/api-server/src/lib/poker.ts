export const POKER_MIN_BUY_IN = 20;
export const POKER_MAX_BUY_IN = 500;
export const POKER_INVITE_EXPIRY_MS = 120_000;
export const POKER_ACTION_TIMEOUT_MS = 60_000;
export const POKER_INTER_HAND_DELAY_MS = 5_000;

export type PokerPhase =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "hand_result"
  | "session_complete";

export type PokerActionType = "fold" | "check" | "call" | "raise";

export type PokerActionLog = {
  playerId: number;
  action: PokerActionType;
  amount?: number;
  timedOut?: boolean;
};

export type PokerGameState = {
  deck: string[];
  board: string[];
  holeCards: Record<string, [string, string]>;
  stacks: Record<string, number>;
  pot: number;
  phase: PokerPhase;
  streetBets: Record<string, number>;
  currentBet: number;
  actionOn: number;
  buttonPlayerId: number;
  smallBlind: number;
  bigBlind: number;
  lastRaiseSize: number;
  actionDeadlineAt: string;
  acted: Record<string, boolean>;
  lastAggressor: number | null;
  handNumber: number;
  tableBuyIn: number;
  nextHandAt?: string;
  actions: PokerActionLog[];
  winnerId?: number;
  winReason?: "fold" | "showdown";
  winningHand?: string;
  foldedPlayerId?: number;
};

const RANK_CHARS = "23456789TJQKA";
const SUITS = "cdhs";

const RANK_CHAR_TO_VALUE: Record<string, number> = Object.fromEntries(
  RANK_CHARS.split("").map((char, index) => [char, index + 2]),
);

export function parseCard(card: string): { rank: number; suit: number } {
  const rankChar = card[0]!;
  const suitChar = card[1]!;
  const rank = RANK_CHAR_TO_VALUE[rankChar];
  const suit = SUITS.indexOf(suitChar);
  if (!rank || suit < 0) {
    throw new Error(`Invalid card: ${card}`);
  }
  return { rank, suit };
}

export type HandScore = {
  category: number;
  kickers: number[];
};

const HAND_CATEGORY_NAMES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
];

export function compareHandScores(left: HandScore, right: HandScore): number {
  if (left.category !== right.category) {
    return left.category - right.category;
  }
  const length = Math.max(left.kickers.length, right.kickers.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left.kickers[index] ?? 0) - (right.kickers[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function describeHandScore(score: HandScore): string {
  return HAND_CATEGORY_NAMES[score.category] ?? "Unknown";
}

export function evaluateHand(cards: string[]): HandScore {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Hand evaluation requires 5–7 cards");
  }

  let best: HandScore | null = null;
  for (const combo of combinations(cards, 5)) {
    const score = evaluateFiveCards(combo);
    if (!best || compareHandScores(score, best) > 0) {
      best = score;
    }
  }
  return best!;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, size - 1).map((combo) => [first!, ...combo]);
  const withoutFirst = combinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

function evaluateFiveCards(cards: string[]): HandScore {
  const parsed = cards.map(parseCard);
  const ranks = parsed.map((card) => card.rank).sort((a, b) => b - a);
  const suits = parsed.map((card) => card.suit);
  const isFlush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(ranks);
  const isStraight = straightHigh !== null;

  const counts = new Map<number, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1];
    return right[0] - left[0];
  });

  if (isFlush && isStraight) {
    return { category: 8, kickers: [straightHigh!] };
  }

  if (groups[0]![1] === 4) {
    return { category: 7, kickers: [groups[0]![0], groups[1]![0]] };
  }

  if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    return { category: 6, kickers: [groups[0]![0], groups[1]![0]] };
  }

  if (isFlush) {
    return { category: 5, kickers: ranks };
  }

  if (isStraight) {
    return { category: 4, kickers: [straightHigh!] };
  }

  if (groups[0]![1] === 3) {
    const kickers = groups
      .slice(1)
      .map(([rank]) => rank)
      .sort((a, b) => b - a);
    return { category: 3, kickers: [groups[0]![0], ...kickers] };
  }

  if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    const pairRanks = [groups[0]![0], groups[1]![0]].sort((a, b) => b - a);
    const kicker = groups[2]![0];
    return { category: 2, kickers: [...pairRanks, kicker] };
  }

  if (groups[0]![1] === 2) {
    const kickers = groups
      .slice(1)
      .map(([rank]) => rank)
      .sort((a, b) => b - a);
    return { category: 1, kickers: [groups[0]![0], ...kickers] };
  }

  return { category: 0, kickers: ranks };
}

function getStraightHigh(ranks: number[]): number | null {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) {
    unique.push(1);
  }
  unique.sort((a, b) => b - a);

  for (let index = 0; index <= unique.length - 5; index += 1) {
    const slice = unique.slice(index, index + 5);
    if (slice[0]! - slice[4]! === 4 && new Set(slice).size === 5) {
      return slice[0] === 5 && slice[4] === 1 ? 5 : slice[0]!;
    }
  }
  return null;
}

export function createDeck(): string[] {
  const deck: string[] = [];
  for (const rank of RANK_CHARS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: string[]): string[] {
  const copy = [...deck];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

export function getBlinds(buyIn: number): { smallBlind: number; bigBlind: number } {
  const bigBlind = Math.max(2, Math.floor(buyIn / 20));
  const smallBlind = Math.max(1, Math.floor(bigBlind / 2));
  return { smallBlind, bigBlind };
}

export function createInitialPokerState(
  player1Id: number,
  player2Id: number,
  buyIn: number,
): PokerGameState {
  const { smallBlind, bigBlind } = getBlinds(buyIn);
  const buttonPlayerId = player1Id;
  const bigBlindPlayerId = player2Id;

  const stacks: Record<string, number> = {
    [String(player1Id)]: buyIn,
    [String(player2Id)]: buyIn,
  };

  return startNewHand({
    player1Id,
    player2Id,
    stacks,
    buttonPlayerId,
    bigBlindPlayerId,
    smallBlind,
    bigBlind,
    tableBuyIn: buyIn,
    handNumber: 1,
  });
}

type StartHandInput = {
  player1Id: number;
  player2Id: number;
  stacks: Record<string, number>;
  buttonPlayerId: number;
  bigBlindPlayerId: number;
  smallBlind: number;
  bigBlind: number;
  tableBuyIn: number;
  handNumber: number;
};

function startNewHand(input: StartHandInput): PokerGameState {
  const {
    player1Id,
    player2Id,
    stacks,
    buttonPlayerId,
    bigBlindPlayerId,
    smallBlind,
    bigBlind,
    tableBuyIn,
    handNumber,
  } = input;

  const deck = createDeck();
  const holeCards: Record<string, [string, string]> = {};
  const streetBets: Record<string, number> = {
    [String(player1Id)]: 0,
    [String(player2Id)]: 0,
  };
  const workingStacks = { ...stacks };

  const dealCard = () => deck.pop()!;

  holeCards[String(player1Id)] = [dealCard(), dealCard()];
  holeCards[String(player2Id)] = [dealCard(), dealCard()];

  const postBlind = (playerId: number, amount: number) => {
    const key = String(playerId);
    const posted = Math.min(amount, workingStacks[key]!);
    workingStacks[key]! -= posted;
    streetBets[key]! += posted;
  };

  postBlind(buttonPlayerId, smallBlind);
  postBlind(bigBlindPlayerId, bigBlind);

  const pot = streetBets[String(player1Id)]! + streetBets[String(player2Id)]!;

  const state: PokerGameState = {
    deck,
    board: [],
    holeCards,
    stacks: workingStacks,
    pot,
    phase: "preflop",
    streetBets,
    currentBet: bigBlind,
    actionOn: buttonPlayerId,
    buttonPlayerId,
    smallBlind,
    bigBlind,
    lastRaiseSize: bigBlind,
    actionDeadlineAt: "",
    acted: {
      [String(player1Id)]: false,
      [String(player2Id)]: false,
    },
    lastAggressor: bigBlindPlayerId,
    handNumber,
    tableBuyIn,
    actions: [],
  };

  return startTurnTimer(state);
}

export function dealNextHand(state: PokerGameState): PokerGameState {
  const playerIds = Object.keys(state.stacks).map(Number);
  const [player1Id, player2Id] = playerIds;
  const nextButton =
    state.buttonPlayerId === player1Id ? player2Id! : player1Id!;
  const nextBigBlind = nextButton === player1Id ? player2Id! : player1Id!;
  const { smallBlind, bigBlind } = getBlinds(state.tableBuyIn);

  return startNewHand({
    player1Id: player1Id!,
    player2Id: player2Id!,
    stacks: { ...state.stacks },
    buttonPlayerId: nextButton,
    bigBlindPlayerId: nextBigBlind,
    smallBlind,
    bigBlind,
    tableBuyIn: state.tableBuyIn,
    handNumber: state.handNumber + 1,
  });
}

function canContinueSession(state: PokerGameState): boolean {
  const stacks = Object.values(state.stacks);
  return stacks.every((stack) => stack > 0);
}

function finalizeHand(state: PokerGameState): PokerGameState {
  const next = structuredClone(state);
  next.phase = "hand_result";
  next.nextHandAt = new Date(
    Date.now() + POKER_INTER_HAND_DELAY_MS,
  ).toISOString();
  next.actionDeadlineAt = "";
  return next;
}

export function processInterHandProgression(
  state: PokerGameState,
  nowMs: number = Date.now(),
  options?: { force?: boolean },
): { state: PokerGameState; changed: boolean; sessionEnded: boolean } {
  if (state.phase !== "hand_result") {
    return { state, changed: false, sessionEnded: false };
  }

  if (
    !options?.force &&
    (!state.nextHandAt || Date.parse(state.nextHandAt) > nowMs)
  ) {
    return { state, changed: false, sessionEnded: false };
  }

  if (!canContinueSession(state)) {
    const next = structuredClone(state);
    const playerIds = Object.keys(state.stacks).map(Number);
    next.winnerId = playerIds.reduce((bestId, playerId) =>
      (state.stacks[String(playerId)] ?? 0) > (state.stacks[String(bestId)] ?? 0)
        ? playerId
        : bestId,
    );
    next.phase = "session_complete";
    next.nextHandAt = undefined;
    next.winningHand = next.winningHand ?? "Table closed";
    return { state: next, changed: true, sessionEnded: true };
  }

  return {
    state: dealNextHand(state),
    changed: true,
    sessionEnded: false,
  };
}

function isBettingPhase(phase: PokerPhase): boolean {
  return (
    phase === "preflop" ||
    phase === "flop" ||
    phase === "turn" ||
    phase === "river"
  );
}

function allPlayersAllIn(state: PokerGameState): boolean {
  return Object.values(state.stacks).every((stack) => stack === 0);
}

function playerCanAct(state: PokerGameState, playerId: number): boolean {
  const stack = state.stacks[String(playerId)] ?? 0;
  if (stack > 0) {
    return true;
  }
  return getCallAmount(state, playerId) === 0;
}

function getFirstPlayerToAct(state: PokerGameState): number {
  const preferred = getOtherPlayerId(state, state.buttonPlayerId);
  if (playerCanAct(state, preferred)) {
    return preferred;
  }
  if (playerCanAct(state, state.buttonPlayerId)) {
    return state.buttonPlayerId;
  }
  return preferred;
}

function returnUncalledBets(state: PokerGameState): PokerGameState {
  const next = structuredClone(state);
  const playerIds = Object.keys(next.stacks).map(Number);
  const [player1Id, player2Id] = playerIds;
  const key1 = String(player1Id);
  const key2 = String(player2Id);
  const bet1 = next.streetBets[key1] ?? 0;
  const bet2 = next.streetBets[key2] ?? 0;

  if (bet1 === bet2) {
    return next;
  }

  const higherId = bet1 > bet2 ? player1Id! : player2Id!;
  const lowerId = getOtherPlayerId(next, higherId);
  const higherKey = String(higherId);
  const lowerKey = String(lowerId);

  if ((next.stacks[lowerKey] ?? 0) !== 0) {
    return next;
  }

  const matched = Math.min(bet1, bet2);
  const excess = Math.abs(bet1 - bet2);
  next.streetBets[higherKey]! = matched;
  next.pot -= excess;
  next.stacks[higherKey]! += excess;
  next.currentBet = matched;
  return next;
}

function isBettingRoundComplete(state: PokerGameState): boolean {
  const playerIds = Object.keys(state.stacks).map(Number);
  const [player1Id, player2Id] = playerIds;
  const key1 = String(player1Id);
  const key2 = String(player2Id);
  const bet1 = state.streetBets[key1] ?? 0;
  const bet2 = state.streetBets[key2] ?? 0;
  const stack1 = state.stacks[key1] ?? 0;
  const stack2 = state.stacks[key2] ?? 0;

  if (stack1 === 0 && stack2 === 0) {
    return true;
  }

  if (bet1 === bet2 && state.acted[key1] && state.acted[key2]) {
    return true;
  }

  if (stack1 === 0 && bet1 < state.currentBet && state.acted[key2]) {
    return true;
  }

  if (stack2 === 0 && bet2 < state.currentBet && state.acted[key1]) {
    return true;
  }

  return false;
}

function closeBettingRound(state: PokerGameState): PokerGameState {
  return advancePhase(returnUncalledBets(state));
}

export function needsPokerStateSync(
  state: PokerGameState,
  nowMs: number = Date.now(),
): boolean {
  if (state.phase === "hand_result" && state.nextHandAt) {
    return Date.parse(state.nextHandAt) <= nowMs;
  }

  if (!isBettingPhase(state.phase)) {
    return false;
  }

  if (!playerCanAct(state, state.actionOn)) {
    return true;
  }

  if (allPlayersAllIn(state)) {
    return true;
  }

  if (!state.actionDeadlineAt) {
    return false;
  }

  return Date.parse(state.actionDeadlineAt) <= nowMs;
}

export function repairPokerBettingState(
  state: PokerGameState,
): { state: PokerGameState; changed: boolean } {
  if (!isBettingPhase(state.phase)) {
    return { state, changed: false };
  }

  let next = structuredClone(state);
  let changed = false;
  let guard = 0;

  while (guard < 8) {
    guard += 1;

    if (allPlayersAllIn(next)) {
      if (next.phase === "river") {
        return { state: resolveShowdown(next), changed: true };
      }
      next = advancePhase(next);
      changed = true;
      continue;
    }

    if (!playerCanAct(next, next.actionOn)) {
      next.acted[String(next.actionOn)] = true;
      changed = true;

      if (isBettingRoundComplete(next)) {
        next = closeBettingRound(next);
        changed = true;
        continue;
      }

      const otherId = getOtherPlayerId(next, next.actionOn);
      if (playerCanAct(next, otherId)) {
        next.actionOn = otherId;
        next = startTurnTimer(next);
        break;
      }

      next = closeBettingRound(next);
      changed = true;
      continue;
    }

    break;
  }

  return { state: next, changed };
}

export function normalizePokerState(state: PokerGameState): PokerGameState {
  const next = structuredClone(state);
  if (!next.lastRaiseSize) {
    next.lastRaiseSize = next.bigBlind;
  }
  if (!next.handNumber) {
    next.handNumber = 1;
  }
  if (!next.tableBuyIn) {
    const stacks = Object.values(next.stacks);
    next.tableBuyIn = stacks.length > 0 ? Math.max(...stacks) : POKER_MIN_BUY_IN;
  }
  if ((next.phase as string) === "complete") {
    next.phase = "hand_result";
    if (!next.nextHandAt) {
      next.nextHandAt = new Date(0).toISOString();
    }
  }
  if (!next.actionDeadlineAt && isBettingPhase(next.phase)) {
    next.actionDeadlineAt = new Date(
      Date.now() + POKER_ACTION_TIMEOUT_MS,
    ).toISOString();
  }
  return next;
}

function startTurnTimer(state: PokerGameState): PokerGameState {
  if (!isBettingPhase(state.phase)) {
    return state;
  }
  state.actionDeadlineAt = new Date(
    Date.now() + POKER_ACTION_TIMEOUT_MS,
  ).toISOString();
  return state;
}

export function getAutoActionOnTimeout(
  state: PokerGameState,
  playerId: number,
): PokerActionType {
  const legal = getLegalActions(state, playerId);
  if (legal.includes("check")) {
    return "check";
  }
  return "fold";
}

export function processPokerTimeouts(
  state: PokerGameState,
  nowMs: number = Date.now(),
): { state: PokerGameState; changed: boolean } {
  let current = normalizePokerState(state);
  let changed = false;
  let guard = 0;

  const repairResult = repairPokerBettingState(current);
  current = repairResult.state;
  changed = changed || repairResult.changed;

  while (
    isBettingPhase(current.phase) &&
    current.actionDeadlineAt &&
    Date.parse(current.actionDeadlineAt) <= nowMs &&
    guard < 12
  ) {
    guard += 1;
    const playerId = current.actionOn;
    if (!playerCanAct(current, playerId)) {
      const stuckRepair = repairPokerBettingState(current);
      if (!stuckRepair.changed) {
        break;
      }
      current = stuckRepair.state;
      changed = true;
      continue;
    }
    const autoAction = getAutoActionOnTimeout(current, playerId);
    try {
      current = applyPokerAction(current, playerId, autoAction, undefined, {
        timedOut: true,
      });
      changed = true;
    } catch {
      break;
    }
  }

  const finalRepair = repairPokerBettingState(current);
  current = finalRepair.state;
  changed = changed || finalRepair.changed;

  return { state: current, changed };
}

export function getOtherPlayerId(
  state: PokerGameState,
  playerId: number,
): number {
  const ids = Object.keys(state.stacks).map(Number);
  const other = ids.find((id) => id !== playerId);
  if (!other) {
    throw new Error("Opponent not found");
  }
  return other;
}

export function getCallAmount(state: PokerGameState, playerId: number): number {
  const key = String(playerId);
  return Math.max(0, state.currentBet - (state.streetBets[key] ?? 0));
}

export function getMinRaiseTotal(state: PokerGameState): number {
  return state.currentBet + (state.lastRaiseSize ?? state.bigBlind);
}

export function getLegalActions(
  state: PokerGameState,
  playerId: number,
): PokerActionType[] {
  if (!isBettingPhase(state.phase) || state.actionOn !== playerId) {
    return [];
  }

  if (!playerCanAct(state, playerId)) {
    return [];
  }

  const callAmount = getCallAmount(state, playerId);
  const stack = state.stacks[String(playerId)] ?? 0;
  const actions: PokerActionType[] = ["fold"];

  if (callAmount === 0) {
    actions.push("check");
  }
  if (callAmount > 0 && stack > 0) {
    actions.push("call");
  }
  if (stack > callAmount) {
    actions.push("raise");
  } else if (stack > 0 && callAmount > 0) {
    actions.push("call");
  }

  return [...new Set(actions)];
}

export function applyPokerAction(
  state: PokerGameState,
  playerId: number,
  action: PokerActionType,
  raiseTotal?: number,
  options?: { timedOut?: boolean },
): PokerGameState {
  if (!isBettingPhase(state.phase)) {
    throw new Error("Hand is not accepting actions");
  }
  if (state.actionOn !== playerId) {
    throw new Error("Not your turn");
  }

  const legal = getLegalActions(state, playerId);
  if (!legal.includes(action)) {
    throw new Error("Illegal action");
  }

  const next: PokerGameState = structuredClone(state);
  const key = String(playerId);
  const callAmount = getCallAmount(next, playerId);
  const stack = next.stacks[key] ?? 0;

  const logAction = (entry: PokerActionLog) => {
    next.actions.push({
      ...entry,
      timedOut: options?.timedOut ?? entry.timedOut,
    });
  };

  if (action === "fold") {
    logAction({ playerId, action });
    next.foldedPlayerId = playerId;
    const winnerId = getOtherPlayerId(next, playerId);
    next.winnerId = winnerId;
    next.winReason = "fold";
    next.stacks[String(winnerId)]! += next.pot;
    next.pot = 0;
    return finalizeHand(next);
  }

  if (action === "check") {
    if (callAmount > 0) {
      throw new Error("Cannot check facing a bet");
    }
    logAction({ playerId, action });
    next.acted[key] = true;
    return startTurnTimer(advanceAfterAction(next, playerId));
  }

  if (action === "call") {
    const pay = Math.min(callAmount, stack);
    next.stacks[key]! -= pay;
    next.streetBets[key]! += pay;
    next.pot += pay;
    logAction({ playerId, action, amount: pay });
    next.acted[key] = true;

    const otherId = getOtherPlayerId(next, playerId);
    const otherKey = String(otherId);
    const betsEqual =
      (next.streetBets[key] ?? 0) === (next.streetBets[otherKey] ?? 0);

    if (!betsEqual) {
      if (!playerCanAct(next, otherId)) {
        next.acted[otherKey] = true;
        return startTurnTimer(advanceAfterAction(next, playerId));
      }
      next.actionOn = otherId;
      return startTurnTimer(next);
    }

    return startTurnTimer(advanceAfterAction(next, playerId));
  }

  if (action === "raise") {
    const previousStreetBet = next.streetBets[key] ?? 0;
    const previousCurrentBet = next.currentBet;
    const minTotal = getMinRaiseTotal(next);
    const targetTotal =
      typeof raiseTotal === "number" && raiseTotal >= minTotal
        ? raiseTotal
        : minTotal;
    const targetStreetBet = Math.min(
      targetTotal,
      previousStreetBet + stack,
    );
    const additional = targetStreetBet - previousStreetBet;

    if (additional <= callAmount) {
      throw new Error("Raise must exceed the current bet");
    }
    if (additional > stack) {
      throw new Error("Not enough chips to raise");
    }

    next.stacks[key]! -= additional;
    next.streetBets[key]! += additional;
    next.pot += additional;
    next.currentBet = Math.max(next.currentBet, next.streetBets[key]!);
    const raiseSize = next.currentBet - previousCurrentBet;
    next.lastRaiseSize = Math.max(next.bigBlind, raiseSize);
    next.lastAggressor = playerId;
    next.acted = {
      [key]: true,
      [String(getOtherPlayerId(next, playerId))]: false,
    };
    logAction({ playerId, action: "raise", amount: next.streetBets[key] });
    const otherId = getOtherPlayerId(next, playerId);
    if (!playerCanAct(next, otherId)) {
      next.acted[String(otherId)] = true;
      return startTurnTimer(advanceAfterAction(next, playerId));
    }
    next.actionOn = otherId;
    return startTurnTimer(next);
  }

  throw new Error("Unsupported action");
}

function advanceAfterAction(
  state: PokerGameState,
  actingPlayerId: number,
): PokerGameState {
  if (isBettingRoundComplete(state)) {
    return closeBettingRound(state);
  }

  const otherId = getOtherPlayerId(state, actingPlayerId);
  if (playerCanAct(state, otherId)) {
    state.actionOn = otherId;
    return state;
  }

  return closeBettingRound(state);
}

function burnCard(state: PokerGameState): void {
  const burned = state.deck.pop();
  if (!burned) {
    throw new Error("Deck exhausted");
  }
}

function advancePhase(state: PokerGameState): PokerGameState {
  const playerIds = Object.keys(state.stacks).map(Number);
  const next: PokerGameState = structuredClone(state);
  next.acted = Object.fromEntries(playerIds.map((id) => [String(id), false]));
  next.streetBets = Object.fromEntries(playerIds.map((id) => [String(id), 0]));
  next.currentBet = 0;
  next.lastAggressor = null;
  next.lastRaiseSize = next.bigBlind;

  const dealBoardCard = () => {
    const card = next.deck.pop();
    if (!card) throw new Error("Deck exhausted");
    next.board.push(card);
  };

  if (next.phase === "preflop") {
    next.phase = "flop";
    burnCard(next);
    dealBoardCard();
    dealBoardCard();
    dealBoardCard();
    if (allPlayersAllIn(next)) {
      return advancePhase(next);
    }
    next.actionOn = getFirstPlayerToAct(next);
    return startTurnTimer(next);
  }

  if (next.phase === "flop") {
    next.phase = "turn";
    burnCard(next);
    dealBoardCard();
    if (allPlayersAllIn(next)) {
      return advancePhase(next);
    }
    next.actionOn = getFirstPlayerToAct(next);
    return startTurnTimer(next);
  }

  if (next.phase === "turn") {
    next.phase = "river";
    burnCard(next);
    dealBoardCard();
    if (allPlayersAllIn(next)) {
      return resolveShowdown(next);
    }
    next.actionOn = getFirstPlayerToAct(next);
    return startTurnTimer(next);
  }

  return resolveShowdown(next);
}

function resolveShowdown(state: PokerGameState): PokerGameState {
  const playerIds = Object.keys(state.holeCards).map(Number);
  const [player1Id, player2Id] = playerIds;
  const cards1 = [...state.holeCards[String(player1Id)]!, ...state.board];
  const cards2 = [...state.holeCards[String(player2Id)]!, ...state.board];
  const score1 = evaluateHand(cards1);
  const score2 = evaluateHand(cards2);
  const comparison = compareHandScores(score1, score2);

  const next: PokerGameState = structuredClone(state);
  next.winReason = "showdown";

  if (comparison > 0) {
    next.winnerId = player1Id;
    next.winningHand = describeHandScore(score1);
  } else if (comparison < 0) {
    next.winnerId = player2Id;
    next.winningHand = describeHandScore(score2);
  } else {
    const split = Math.floor(next.pot / 2);
    next.stacks[String(player1Id)]! += split;
    next.stacks[String(player2Id)]! += next.pot - split;
    next.pot = 0;
    next.winnerId = player1Id;
    next.winningHand = `Split pot — ${describeHandScore(score1)}`;
    return finalizeHand(next);
  }

  next.stacks[String(next.winnerId!)]! += next.pot;
  next.pot = 0;
  return finalizeHand(next);
}

export function serializePokerStateForViewer(
  state: PokerGameState,
  viewerId: number,
): Record<string, unknown> {
  const playerIds = Object.keys(state.holeCards).map(Number);
  const holeCards: Record<string, string[] | null> = {};

  for (const playerId of playerIds) {
    if (
      state.phase === "hand_result" ||
      state.phase === "session_complete" ||
      playerId === viewerId
    ) {
      holeCards[String(playerId)] = state.holeCards[String(playerId)] ?? null;
    } else {
      holeCards[String(playerId)] = null;
    }
  }

  const secondsUntilNextHand =
    state.phase === "hand_result" && state.nextHandAt
      ? Math.max(
          0,
          Math.ceil((Date.parse(state.nextHandAt) - Date.now()) / 1000),
        )
      : 0;

  return {
    board: state.board,
    holeCards,
    stacks: state.stacks,
    pot: state.pot,
    phase: state.phase,
    handNumber: state.handNumber,
    streetBets: state.streetBets,
    currentBet: state.currentBet,
    actionOn: state.actionOn,
    buttonPlayerId: state.buttonPlayerId,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    actions: state.actions,
    winnerId: state.winnerId,
    winReason: state.winReason,
    winningHand: state.winningHand,
    nextHandAt: state.nextHandAt,
    secondsUntilNextHand,
    legalActions:
      isBettingPhase(state.phase) && state.actionOn === viewerId
        ? getLegalActions(state, viewerId)
        : [],
    callAmount:
      isBettingPhase(state.phase) ? getCallAmount(state, viewerId) : 0,
    minRaiseTotal:
      isBettingPhase(state.phase) ? getMinRaiseTotal(state) : 0,
    actionDeadlineAt: state.actionDeadlineAt,
    actionTimeoutSeconds: POKER_ACTION_TIMEOUT_MS / 1000,
    secondsRemaining:
      isBettingPhase(state.phase) && state.actionDeadlineAt
        ? Math.max(
            0,
            Math.ceil((Date.parse(state.actionDeadlineAt) - Date.now()) / 1000),
          )
        : 0,
  };
}
