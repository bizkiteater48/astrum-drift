import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useCollectMining,
  useStartMining,
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
    if (startedAtMs) {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const remaining = Math.max(0, cycleSecs - elapsed);
      setTimeLeft(remaining);
    } else {
      setTimeLeft(null);
    }

    if (!isMiningRef.current) {
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
    if (elapsed < cycleSecs) {
      return;
    }
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

  const handleStop = useCallback(() => {
    if (!isMining) return;
    setIsMining(false);
    isMiningRef.current = false;
    onMessage(
      "[SYSTEM] Auto-cycle disengaged. In-progress cycle can be resumed later.",
    );
  }, [isMining, onMessage]);

  const hasInProgressCycle = !!startedAtMs;

  return {
    isMining,
    hasInProgressCycle,
    timeLeft,
    handleStart,
    handleStop,
    isBusy: collectMining.isPending || startMining.isPending,
  };
}
