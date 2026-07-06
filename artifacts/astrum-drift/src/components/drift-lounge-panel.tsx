import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Dices, Loader2, Spade, Swords, X } from "lucide-react";
import type { Player } from "@workspace/api-client-react";
import {
  HOUSE_MAX_STAKE,
  HOUSE_MIN_STAKE,
  POKER_MAX_BUY_IN,
  POKER_MIN_BUY_IN,
  POKER_ACTION_TIMEOUT_SEC,
  PVP_MAX_STAKE,
  PVP_MIN_STAKE,
  SILVER_ORE_ITEM,
} from "@/lib/gambling";
import {
  acceptGamblingChallenge,
  acceptPokerInvite,
  createGamblingChallenge,
  createPokerInvite,
  declineGamblingChallenge,
  declinePokerInvite,
  dealNextPokerHand,
  listGamblingChallenges,
  listPokerGames,
  mintSilverCoins,
  playHouseGame,
  submitPokerAction,
  type GamblingChallenge,
  type HousePlayOutcome,
  type PokerActionType,
  type PokerGame,
} from "@/lib/gambling-api";
import { ApiError, customFetch, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PokerCard, PokerCardBack } from "@/components/poker-card";
import { PlayerUsernameSelect } from "@/components/player-username-select";

type DriftLoungePanelProps = {
  player: Player;
  silverOreCount: number;
  onClose: () => void;
  onPlayerUpdated: (player: Player) => void;
  onMintOre: (quantity: number) => boolean;
  onRefundOre: (quantity: number) => void;
  onNotice: (message: string) => void;
};

export function DriftLoungePanel({
  player,
  silverOreCount,
  onClose,
  onPlayerUpdated,
  onMintOre,
  onRefundOre,
  onNotice,
}: DriftLoungePanelProps) {
  const queryClient = useQueryClient();
  const activePokerGameIdRef = useRef<number | null>(null);
  const [houseStake, setHouseStake] = useState("10");
  const [diceChoice, setDiceChoice] = useState<"over" | "under">("over");
  const [flipChoice, setFlipChoice] = useState<"heads" | "tails">("heads");
  const [pvpOpponent, setPvpOpponent] = useState("");
  const [pvpStake, setPvpStake] = useState("25");
  const [pvpChoice, setPvpChoice] = useState<"heads" | "tails">("heads");
  const [pokerOpponent, setPokerOpponent] = useState("");
  const [pokerBuyIn, setPokerBuyIn] = useState("100");
  const [pokerRaiseTotal, setPokerRaiseTotal] = useState("0");
  const [challenges, setChallenges] = useState<GamblingChallenge[]>([]);
  const [pokerGames, setPokerGames] = useState<PokerGame[]>([]);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [turnClockTick, setTurnClockTick] = useState(0);

  const activePokerGame = useMemo(
    () => pokerGames.find((game) => game.status === "active") ?? null,
    [pokerGames],
  );
  const pokerInvites = useMemo(
    () => pokerGames.filter((game) => game.status === "invited"),
    [pokerGames],
  );

  const loadChallenges = useCallback(async () => {
    try {
      const data = await listGamblingChallenges();
      setChallenges(data.challenges);
    } catch {
      setChallenges([]);
    }
  }, []);

  const loadPokerGames = useCallback(async () => {
    try {
      const data = await listPokerGames();
      const previousActiveId = activePokerGameIdRef.current;
      const nextActive = data.games.find((game) => game.status === "active") ?? null;
      activePokerGameIdRef.current = nextActive?.id ?? null;

      if (
        previousActiveId &&
        !data.games.some(
          (game) => game.id === previousActiveId && game.status === "active",
        )
      ) {
        const endedGame = data.games.find(
          (game) => game.id === previousActiveId && game.status === "complete",
        );
        if (endedGame) {
          try {
            const refreshed = await customFetch<Player>("/api/auth/me");
            onPlayerUpdated(refreshed);
            await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          } catch {
            // Ignore refresh errors; table state still updated.
          }
          if (endedGame.state?.winnerId) {
            const winnerName = getPokerWinnerName(endedGame, endedGame.state.winnerId);
            const message = `${winnerName} won the table.`;
            setLastOutcome(message);
            onNotice(message);
          }
        }
      }

      setPokerGames(data.games);
    } catch {
      setPokerGames([]);
    }
  }, [onNotice, onPlayerUpdated, queryClient]);

  const loadLoungeData = useCallback(async () => {
    await Promise.all([loadChallenges(), loadPokerGames()]);
  }, [loadChallenges, loadPokerGames]);

  useEffect(() => {
    void loadLoungeData();
    const interval = window.setInterval(() => {
      void loadLoungeData();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [loadLoungeData]);

  useEffect(() => {
    if (!activePokerGame?.state) {
      return;
    }
    const interval = window.setInterval(() => {
      setTurnClockTick((tick) => tick + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [
    activePokerGame?.id,
    activePokerGame?.state?.phase,
    activePokerGame?.state?.actionDeadlineAt,
    activePokerGame?.state?.nextHandAt,
  ]);

  useEffect(() => {
    if (activePokerGame?.state?.minRaiseTotal) {
      setPokerRaiseTotal(String(activePokerGame.state.minRaiseTotal));
    }
  }, [activePokerGame?.state?.minRaiseTotal, activePokerGame?.id]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      return (error.data as { error?: string } | null)?.error ?? error.message;
    }
    return fallback;
  };

  const handleMintOne = async () => {
    if (silverOreCount < 1) {
      onNotice("You need 1 Silver Ore to mint a coin.");
      return;
    }

    if (!onMintOre(1)) return;

    setBusyAction("mint");
    try {
      const result = await mintSilverCoins(1);
      onPlayerUpdated(result.player);
      onNotice(`Minted 1 Silver Coin.`);
      setLastOutcome("Minted 1 Silver Coin from 1 Silver Ore.");
    } catch (error) {
      onRefundOre(1);
      onNotice(getErrorMessage(error, "Failed to mint silver coin."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleHousePlay = async (game: "reactor_dice" | "warp_flip") => {
    const stake = Number(houseStake);
    if (!Number.isInteger(stake) || stake < HOUSE_MIN_STAKE || stake > HOUSE_MAX_STAKE) {
      onNotice(`House stake must be ${HOUSE_MIN_STAKE}–${HOUSE_MAX_STAKE} coins.`);
      return;
    }

    setBusyAction(game);
    try {
      const result = await playHouseGame({
        game,
        stake,
        choice: game === "reactor_dice" ? diceChoice : flipChoice,
      });
      onPlayerUpdated(result.player);
      setLastOutcome(formatHouseOutcome(result.outcome));
      onNotice(formatHouseOutcome(result.outcome));
    } catch (error) {
      onNotice(getErrorMessage(error, "House game failed."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateChallenge = async () => {
    const stake = Number(pvpStake);
    const opponentUsername = pvpOpponent.trim();

    if (!opponentUsername) {
      onNotice("Enter an opponent username.");
      return;
    }

    if (!Number.isInteger(stake) || stake < PVP_MIN_STAKE || stake > PVP_MAX_STAKE) {
      onNotice(`PvP stake must be ${PVP_MIN_STAKE}–${PVP_MAX_STAKE} coins.`);
      return;
    }

    setBusyAction("challenge");
    try {
      await createGamblingChallenge({
        opponentUsername,
        stake,
        choice: pvpChoice,
      });
      onNotice(`Challenge sent to ${opponentUsername} for ${stake} coins.`);
      setPvpOpponent("");
      await loadLoungeData();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to send challenge."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreatePokerInvite = async () => {
    const buyIn = Number(pokerBuyIn);
    const opponentUsername = pokerOpponent.trim();

    if (!opponentUsername) {
      onNotice("Enter an opponent username.");
      return;
    }

    if (
      !Number.isInteger(buyIn) ||
      buyIn < POKER_MIN_BUY_IN ||
      buyIn > POKER_MAX_BUY_IN
    ) {
      onNotice(`Buy-in must be ${POKER_MIN_BUY_IN}–${POKER_MAX_BUY_IN} coins.`);
      return;
    }

    setBusyAction("poker-invite");
    try {
      await createPokerInvite({ opponentUsername, buyIn });
      onNotice(`Poker invite sent to ${opponentUsername} (${buyIn} coin buy-in).`);
      setPokerOpponent("");
      await loadPokerGames();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to send poker invite."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptPokerInvite = async (game: PokerGame) => {
    setBusyAction(`poker-accept-${game.id}`);
    try {
      const result = await acceptPokerInvite(game.id);
      onPlayerUpdated(result.player);
      onNotice("Texas Hold'em hand started.");
      await loadPokerGames();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to start poker hand."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeclinePokerInvite = async (gameId: number) => {
    setBusyAction(`poker-decline-${gameId}`);
    try {
      await declinePokerInvite(gameId);
      onNotice("Poker invite declined.");
      await loadPokerGames();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to decline poker invite."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDealNextPokerHand = async (gameId: number) => {
    setBusyAction(`poker-next-${gameId}`);
    try {
      const result = await dealNextPokerHand(gameId);
      onPlayerUpdated(result.player);

      if (result.game.status === "complete" && result.game.state) {
        const winnerName = getPokerWinnerName(
          result.game,
          result.game.state.winnerId ?? result.game.winnerId ?? 0,
        );
        const message = `${winnerName} won the table.`;
        setLastOutcome(message);
        onNotice(message);
      } else {
        onNotice(`Hand #${result.game.state?.handNumber ?? "?"} dealt.`);
      }

      await loadPokerGames();
    } catch (error) {
      onNotice(getErrorMessage(error, "Could not deal the next hand."));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePokerAction = async (gameId: number, action: PokerActionType) => {
    setBusyAction(`poker-${action}-${gameId}`);
    try {
      const body: { action: PokerActionType; raiseTotal?: number } = { action };
      if (action === "raise") {
        const raiseTotal = Number(pokerRaiseTotal);
        if (!Number.isInteger(raiseTotal) || raiseTotal <= 0) {
          onNotice("Enter a valid raise total.");
          return;
        }
        body.raiseTotal = raiseTotal;
      }

      const result = await submitPokerAction(gameId, body);
      onPlayerUpdated(result.player);

      if (result.game.status === "complete" && result.game.state) {
        const winnerName = getPokerWinnerName(
          result.game,
          result.game.state.winnerId ?? result.game.winnerId ?? 0,
        );
        const message = `${winnerName} won the table.`;
        setLastOutcome(message);
        onNotice(message);
      } else if (result.game.state?.phase === "hand_result") {
        const winnerName = getPokerWinnerName(
          result.game,
          result.game.state.winnerId ?? 0,
        );
        const handLabel = result.game.state.winningHand
          ? ` with ${result.game.state.winningHand}`
          : result.game.state.winReason === "fold"
            ? " by fold"
            : "";
        const message = `${winnerName} won hand #${result.game.state.handNumber ?? "?"}${handLabel}.`;
        setLastOutcome(message);
        onNotice(message);
      }

      await loadPokerGames();
    } catch (error) {
      onNotice(getErrorMessage(error, "Poker action failed."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptChallenge = async (challenge: GamblingChallenge) => {
    setBusyAction(`accept-${challenge.id}`);
    try {
      const result = await acceptGamblingChallenge(challenge.id);
      onPlayerUpdated(result.player);
      const message = result.result.won
        ? `You won ${result.result.payout} coins (${result.result.flip}).`
        : `${result.result.winnerUsername} won ${result.result.payout} coins (${result.result.flip}).`;
      setLastOutcome(message);
      onNotice(message);
      await loadLoungeData();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to accept challenge."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeclineChallenge = async (challengeId: number) => {
    setBusyAction(`decline-${challengeId}`);
    try {
      await declineGamblingChallenge(challengeId);
      onNotice("Challenge declined.");
      await loadLoungeData();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to decline challenge."));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Utility
            </p>
            <h2 className="text-lg text-primary font-bold uppercase tracking-widest">
              Drift Lounge
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded border border-primary/20 text-primary hover:bg-primary/10"
            aria-label="Close Drift Lounge"
          >
            <X className="size-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
          <div className="rounded-lg border border-primary/20 bg-background/40 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary">
                Silver Coins
              </span>
            </div>
            <span className="text-sm font-bold text-chart-3">
              {(player.silverCoins ?? 0).toLocaleString()}
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-primary/80">
              Mint Coins
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              1 {SILVER_ORE_ITEM} → 1 Silver Coin
            </p>
            <button
              type="button"
              onClick={() => void handleMintOne()}
              disabled={busyAction !== null || silverOreCount < 1}
              className="w-full h-9 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
            >
              {busyAction === "mint" ? (
                <Loader2 className="size-4 animate-spin mx-auto" />
              ) : (
                `Mint 1 Coin (${silverOreCount} ore available)`
              )}
            </button>
          </section>

          <section className="space-y-2 border-t border-primary/10 pt-4">
            <h3 className="text-xs uppercase tracking-widest text-primary/80 flex items-center gap-2">
              <Dices className="size-3.5" />
              House Games
            </h3>
            <label className="block space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Stake ({HOUSE_MIN_STAKE}–{HOUSE_MAX_STAKE})
              </span>
              <input
                type="number"
                min={HOUSE_MIN_STAKE}
                max={HOUSE_MAX_STAKE}
                value={houseStake}
                onChange={(event) => setHouseStake(event.target.value)}
                className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2 rounded-lg border border-primary/15 p-2">
                <p className="text-[10px] uppercase tracking-widest text-primary/70">
                  Reactor Dice
                </p>
                <div className="flex gap-1">
                  {(["over", "under"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setDiceChoice(choice)}
                      className={`flex-1 h-7 rounded border text-[10px] uppercase tracking-widest ${
                        diceChoice === choice
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-primary/20 text-primary/60"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleHousePlay("reactor_dice")}
                  disabled={busyAction !== null}
                  className="w-full h-8 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
                >
                  Roll
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-primary/15 p-2">
                <p className="text-[10px] uppercase tracking-widest text-primary/70">
                  Warp Flip
                </p>
                <div className="flex gap-1">
                  {(["heads", "tails"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setFlipChoice(choice)}
                      className={`flex-1 h-7 rounded border text-[10px] uppercase tracking-widest ${
                        flipChoice === choice
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-primary/20 text-primary/60"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleHousePlay("warp_flip")}
                  disabled={busyAction !== null}
                  className="w-full h-8 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
                >
                  Flip
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-primary/10 pt-4">
            <h3 className="text-xs uppercase tracking-widest text-primary/80 flex items-center gap-2">
              <Spade className="size-3.5" />
              PvP Texas Hold&apos;em
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Heads-up · play continues until someone busts · {POKER_ACTION_TIMEOUT_SEC}s per action
            </p>

            {activePokerGame?.state ? (
              <div className="rounded-lg border border-primary/25 bg-background/40 p-3 space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                  <span className="text-primary">
                    Hand #{activePokerGame.state.handNumber ?? 1} ·{" "}
                    {formatPokerPhase(activePokerGame.state.phase)}
                  </span>
                  <div className="text-right">
                    <span className="text-chart-3 font-bold block">
                      Pot {activePokerGame.state.pot}
                    </span>
                    {activePokerGame.state.phase !== "hand_result" && (
                      <span className="text-muted-foreground">
                        {formatPokerTurnClock(activePokerGame, player.id, turnClockTick)}
                      </span>
                    )}
                  </div>
                </div>

                {activePokerGame.state.phase === "hand_result" && (
                  <div className="rounded-lg border border-chart-3/40 bg-chart-3/10 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-chart-3">
                      {formatHandWinnerLine(activePokerGame, player.id)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                      Next hand in{" "}
                      {formatSecondsUntilNextHand(activePokerGame.state, turnClockTick)}s
                    </p>
                  </div>
                )}

                <div className="min-h-16 rounded border border-primary/15 bg-emerald-950/30 px-3 py-2 flex flex-wrap gap-2 items-center justify-center">
                  {activePokerGame.state.board.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Board pending
                    </span>
                  ) : (
                    activePokerGame.state.board.map((card) => (
                      <PokerCard key={card} card={card} size="lg" />
                    ))
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {[activePokerGame.inviterId, activePokerGame.opponentId].map(
                    (seatId) => {
                      const isSelf = seatId === player.id;
                      const username =
                        seatId === activePokerGame.inviterId
                          ? activePokerGame.inviterUsername
                          : activePokerGame.opponentUsername;
                      const holeCards =
                        activePokerGame.state?.holeCards[String(seatId)] ?? null;
                      const stack =
                        activePokerGame.state?.stacks[String(seatId)] ?? 0;
                      const streetBet =
                        activePokerGame.state?.streetBets[String(seatId)] ?? 0;
                      const isActionOn =
                        activePokerGame.state?.actionOn === seatId;

                      return (
                        <div
                          key={seatId}
                          className={`rounded border p-2 ${
                            isActionOn
                              ? "border-chart-3/50 bg-chart-3/5"
                              : "border-primary/15 bg-background/30"
                          }`}
                        >
                          <p className="text-primary uppercase tracking-widest truncate">
                            {username}
                            {isSelf ? " (you)" : ""}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            Stack {stack} · Bet {streetBet}
                          </p>
                          <div className="mt-2 flex gap-2 justify-center">
                            {holeCards ? (
                              holeCards.map((card) => (
                                <PokerCard key={card} card={card} size="lg" />
                              ))
                            ) : (
                              <>
                                <PokerCardBack size="lg" />
                                <PokerCardBack size="lg" />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {activePokerGame.state.legalActions.length > 0 ? (
                  <div className="space-y-2 border-t border-primary/10 pt-2">
                    <p className="text-[10px] text-chart-3 uppercase tracking-widest">
                      Your turn ·{" "}
                      {formatPokerSecondsRemaining(activePokerGame.state)} remaining
                      {activePokerGame.state.callAmount > 0
                        ? ` · call ${activePokerGame.state.callAmount}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activePokerGame.state.legalActions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            void handlePokerAction(activePokerGame.id, action)
                          }
                          className="h-7 px-3 rounded border border-primary/30 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-40"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                    {activePokerGame.state.legalActions.includes("raise") && (
                      <label className="block space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Raise to (min {activePokerGame.state.minRaiseTotal})
                        </span>
                        <input
                          type="number"
                          min={activePokerGame.state.minRaiseTotal}
                          value={pokerRaiseTotal}
                          onChange={(event) => setPokerRaiseTotal(event.target.value)}
                          className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
                        />
                      </label>
                    )}
                  </div>
                ) : activePokerGame.state.phase === "hand_result" ? (
                  <div className="space-y-2 border-t border-primary/10 pt-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Cards revealed · auto-deals in{" "}
                      {formatSecondsUntilNextHand(activePokerGame.state, turnClockTick)}s
                    </p>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleDealNextPokerHand(activePokerGame.id)}
                      className="w-full h-8 rounded border border-chart-3/40 bg-chart-3/10 text-chart-3 text-[10px] uppercase tracking-widest hover:bg-chart-3/20 disabled:opacity-40"
                    >
                      Deal Next Hand
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                    {activePokerGame.state.legalActions.length === 0 &&
                    activePokerGame.state.actionOn === player.id
                      ? "All-in — running out the board…"
                      : "Waiting for opponent…"}
                  </p>
                )}
              </div>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Opponent Username
                  </span>
                  <PlayerUsernameSelect
                    value={pokerOpponent}
                    onChange={setPokerOpponent}
                    selfUsername={player.username}
                    placeholder="Pilot username"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Buy-in ({POKER_MIN_BUY_IN}–{POKER_MAX_BUY_IN})
                  </span>
                  <input
                    type="number"
                    min={POKER_MIN_BUY_IN}
                    max={POKER_MAX_BUY_IN}
                    value={pokerBuyIn}
                    onChange={(event) => setPokerBuyIn(event.target.value)}
                    className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleCreatePokerInvite()}
                  disabled={busyAction !== null}
                  className="w-full h-9 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
                >
                  Send Poker Invite
                </button>
              </>
            )}

            {pokerInvites.length > 0 && (
              <div className="space-y-2">
                {pokerInvites.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-lg border border-primary/15 bg-background/30 p-2 text-[10px] font-mono"
                  >
                    <p className="text-primary uppercase tracking-widest">
                      {game.inviterUsername} vs {game.opponentUsername}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {game.buyIn} coin buy-in · Texas Hold&apos;em
                    </p>
                    {game.isIncoming && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => void handleAcceptPokerInvite(game)}
                          disabled={busyAction !== null}
                          className="flex-1 h-7 rounded border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeclinePokerInvite(game.id)}
                          disabled={busyAction !== null}
                          className="flex-1 h-7 rounded border border-primary/20 text-muted-foreground hover:bg-primary/5 disabled:opacity-40"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {game.isOutgoing && (
                      <p className="text-muted-foreground mt-1 uppercase tracking-widest">
                        Awaiting response…
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2 border-t border-primary/10 pt-4">
            <h3 className="text-xs uppercase tracking-widest text-primary/80 flex items-center gap-2">
              <Swords className="size-3.5" />
              PvP Warp Flip
            </h3>
            <label className="block space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Opponent Username
              </span>
              <PlayerUsernameSelect
                value={pvpOpponent}
                onChange={setPvpOpponent}
                selfUsername={player.username}
                placeholder="Pilot username"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Stake ({PVP_MIN_STAKE}–{PVP_MAX_STAKE})
              </span>
              <input
                type="number"
                min={PVP_MIN_STAKE}
                max={PVP_MAX_STAKE}
                value={pvpStake}
                onChange={(event) => setPvpStake(event.target.value)}
                className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
              />
            </label>
            <div className="flex gap-1">
              {(["heads", "tails"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setPvpChoice(choice)}
                  className={`flex-1 h-7 rounded border text-[10px] uppercase tracking-widest ${
                    pvpChoice === choice
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-primary/20 text-primary/60"
                  }`}
                >
                  Pick {choice}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleCreateChallenge()}
              disabled={busyAction !== null}
              className="w-full h-9 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
            >
              Send Challenge
            </button>
          </section>

          {challenges.length > 0 && (
            <section className="space-y-2 border-t border-primary/10 pt-4">
              <h3 className="text-xs uppercase tracking-widest text-primary/80">
                Pending Wagers
              </h3>
              <div className="space-y-2">
                {challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="rounded-lg border border-primary/15 bg-background/30 p-2 text-[10px] font-mono"
                  >
                    <p className="text-primary uppercase tracking-widest">
                      {challenge.challengerUsername} vs {challenge.opponentUsername}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {challenge.stake} coins · challenger picked{" "}
                      {challenge.challengerChoice}
                    </p>
                    {challenge.isIncoming && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => void handleAcceptChallenge(challenge)}
                          disabled={busyAction !== null}
                          className="flex-1 h-7 rounded border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeclineChallenge(challenge.id)}
                          disabled={busyAction !== null}
                          className="flex-1 h-7 rounded border border-primary/20 text-muted-foreground hover:bg-primary/5 disabled:opacity-40"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {challenge.isOutgoing && (
                      <p className="text-muted-foreground mt-1 uppercase tracking-widest">
                        Awaiting response…
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {lastOutcome && (
            <p className="text-[10px] text-primary/80 uppercase tracking-widest border-t border-primary/10 pt-3">
              {lastOutcome}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatHouseOutcome(outcome: HousePlayOutcome): string {
  if (outcome.game === "reactor_dice") {
    if (outcome.push) {
      return `Roll ${outcome.roll} — push. Stake returned.`;
    }
    return outcome.won
      ? `Roll ${outcome.roll} — won ${outcome.payout} coins.`
      : `Roll ${outcome.roll} — lost ${outcome.stake} coins.`;
  }

  return outcome.won
    ? `${outcome.result} — won ${outcome.payout} coins.`
    : `${outcome.result} — lost ${outcome.stake} coins.`;
}

function getPokerWinnerName(game: PokerGame, winnerId: number): string {
  if (winnerId === game.inviterId) return game.inviterUsername;
  if (winnerId === game.opponentId) return game.opponentUsername;
  return "Winner";
}

function formatHandWinnerLine(game: PokerGame, viewerId: number): string {
  const state = game.state;
  if (!state?.winnerId) return "Hand complete";

  const winnerName =
    state.winnerId === viewerId
      ? "You won"
      : getPokerWinnerName(game, state.winnerId);

  if (state.winReason === "fold") {
    return `${winnerName} the hand (opponent folded)`;
  }

  if (state.winningHand) {
    return `${winnerName} with ${state.winningHand}`;
  }

  return `${winnerName} the hand`;
}

function formatSecondsUntilNextHand(
  state: NonNullable<PokerGame["state"]>,
  _tick: number,
): number {
  if (state.secondsUntilNextHand != null) {
    return state.secondsUntilNextHand;
  }
  if (!state.nextHandAt) {
    return 5;
  }
  return Math.max(
    0,
    Math.ceil((new Date(state.nextHandAt).getTime() - Date.now()) / 1000),
  );
}

function formatPokerPhase(phase: string): string {
  switch (phase) {
    case "preflop":
      return "Preflop";
    case "flop":
      return "Flop";
    case "turn":
      return "Turn";
    case "river":
      return "River";
    case "showdown":
      return "Showdown";
    case "hand_result":
      return "Hand Result";
    case "session_complete":
      return "Session Complete";
    case "complete":
      return "Hand Complete";
    default:
      return phase;
  }
}

function formatPokerSecondsRemaining(
  state: NonNullable<PokerGame["state"]>,
): number {
  if (state.secondsRemaining != null) {
    return state.secondsRemaining;
  }
  if (!state.actionDeadlineAt) {
    return POKER_ACTION_TIMEOUT_SEC;
  }
  return Math.max(
    0,
    Math.ceil((new Date(state.actionDeadlineAt).getTime() - Date.now()) / 1000),
  );
}

function formatPokerTurnClock(
  game: PokerGame,
  viewerId: number,
  _tick: number,
): string {
  const state = game.state;
  if (!state || state.phase === "hand_result" || !state.actionDeadlineAt) {
    return "";
  }

  const seconds = formatPokerSecondsRemaining(state);
  const actorName =
    state.actionOn === viewerId
      ? "Your action"
      : state.actionOn === game.inviterId
        ? game.inviterUsername
        : game.opponentUsername;

  return `${actorName} · ${seconds}s`;
}
