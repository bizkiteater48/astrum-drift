import { useCallback, useEffect, useState } from "react";
import { Coins, Dices, Loader2, Swords, X } from "lucide-react";
import type { Player } from "@workspace/api-client-react";
import {
  HOUSE_MAX_STAKE,
  HOUSE_MIN_STAKE,
  PVP_MAX_STAKE,
  PVP_MIN_STAKE,
  SILVER_ORE_ITEM,
} from "@/lib/gambling";
import {
  acceptGamblingChallenge,
  createGamblingChallenge,
  declineGamblingChallenge,
  listGamblingChallenges,
  mintSilverCoins,
  playHouseGame,
  type GamblingChallenge,
  type HousePlayOutcome,
} from "@/lib/gambling-api";
import { ApiError } from "@workspace/api-client-react";

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
  const [houseStake, setHouseStake] = useState("10");
  const [diceChoice, setDiceChoice] = useState<"over" | "under">("over");
  const [flipChoice, setFlipChoice] = useState<"heads" | "tails">("heads");
  const [pvpOpponent, setPvpOpponent] = useState("");
  const [pvpStake, setPvpStake] = useState("25");
  const [pvpChoice, setPvpChoice] = useState<"heads" | "tails">("heads");
  const [challenges, setChallenges] = useState<GamblingChallenge[]>([]);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    try {
      const data = await listGamblingChallenges();
      setChallenges(data.challenges);
    } catch {
      setChallenges([]);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
    const interval = window.setInterval(() => {
      void loadChallenges();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadChallenges]);

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
      await loadChallenges();
    } catch (error) {
      onNotice(getErrorMessage(error, "Failed to send challenge."));
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
      await loadChallenges();
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
      await loadChallenges();
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
              <Swords className="size-3.5" />
              PvP Warp Flip
            </h3>
            <label className="block space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Opponent Username
              </span>
              <input
                type="text"
                value={pvpOpponent}
                onChange={(event) => setPvpOpponent(event.target.value)}
                placeholder="Pilot username"
                className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
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
