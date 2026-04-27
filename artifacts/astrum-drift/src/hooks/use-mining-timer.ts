import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useCollectMining,
  useStartMining,
  useStopMining,
  Player,
} from "@workspace/api-client-react";
import { extractErrorMessage } from "@/lib/utils";

export function useMiningTimer(
  player: Player | null,
  onMessage: (msg: string) => void,
) {
  const [isMining, setIsMining] = useState<boolean>(
    !!player?.miningStartedAt,
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const collectMining = useCollectMining();
  const startMining = useStartMining();
  const stopMining = useStopMining();

  const isMiningRef = useRef(isMining);
  useEffect(() => {
    isMiningRef.current = isMining;
  }, [isMining]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && player) {
      initializedRef.current = true;
      if (player.miningStartedAt) {
        setIsMining(true);
        isMiningRef.current = true;
      }
    }
  }, [player]);

  const cycleSecs = player?.cycleDurationSec ?? 30;
  const startedAtMs = player?.miningStartedAt
    ? new Date(player.miningStartedAt).getTime()
    : null;

  const inFlightRef = useRef(false);

  const tick = useCallback(async () => {
    if (!isMiningRef.current) {
      setTimeLeft(null);
      return;
    }
    if (!startedAtMs) {
      if (!inFlightRef.current) {
        inFlightRef.current = true;
        try {
          await startMining.mutateAsync();
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } catch (error: unknown) {
          onMessage(
            `[ERROR] Start failed: ${extractErrorMessage(error) ?? "Unknown error"}`,
          );
          setIsMining(false);
          isMiningRef.current = false;
        } finally {
          inFlightRef.current = false;
        }
      }
      return;
    }

    const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
    const remaining = cycleSecs - elapsed;
    if (remaining > 0) {
      setTimeLeft(remaining);
      return;
    }
    setTimeLeft(0);
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await collectMining.mutateAsync();
      if (res?.reward) {
        onMessage(
          `[REWARD] +${res.reward.credits} CR, +${res.reward.experience} XP.`,
        );
        if (res.reward.leveledUp) {
          onMessage(
            `[LEVEL UP] You reached Mining Level ${res.reward.newLevel}!`,
          );
        }
      }
      if (isMiningRef.current) {
        await startMining.mutateAsync();
      }
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: unknown) {
      onMessage(
        `[ERROR] Cycle failed: ${extractErrorMessage(error) ?? "Unknown error"}`,
      );
      setIsMining(false);
      isMiningRef.current = false;
    } finally {
      inFlightRef.current = false;
    }
  }, [
    startedAtMs,
    cycleSecs,
    collectMining,
    startMining,
    queryClient,
    onMessage,
  ]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const handleStart = useCallback(async () => {
    if (isMining) return;
    setIsMining(true);
    isMiningRef.current = true;
    onMessage("[SYSTEM] Extractor array engaged. Auto-cycle initiated.");
    if (!startedAtMs && !inFlightRef.current) {
      inFlightRef.current = true;
      try {
        await startMining.mutateAsync();
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      } catch (error: unknown) {
        onMessage(
          `[ERROR] Start failed: ${extractErrorMessage(error) ?? "Unknown error"}`,
        );
        setIsMining(false);
        isMiningRef.current = false;
      } finally {
        inFlightRef.current = false;
      }
    }
  }, [isMining, startedAtMs, startMining, queryClient, onMessage]);

  const handleStop = useCallback(async () => {
    if (!isMining) return;
    setIsMining(false);
    isMiningRef.current = false;
    setTimeLeft(null);
    onMessage(
      "[SYSTEM] Extractor array disengaged. In-progress cycle abandoned.",
    );
    try {
      await stopMining.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: unknown) {
      onMessage(
        `[ERROR] Stop failed: ${extractErrorMessage(error) ?? "Unknown error"}`,
      );
    }
  }, [isMining, stopMining, queryClient, onMessage]);

  return {
    isMining,
    timeLeft,
    handleStart,
    handleStop,
    isBusy:
      collectMining.isPending || startMining.isPending || stopMining.isPending,
  };
}
