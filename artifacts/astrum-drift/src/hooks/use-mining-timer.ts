import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMe, 
  getGetMeQueryKey,
  useCollectMining,
  Player
} from "@workspace/api-client-react";
import { extractErrorMessage } from "@/lib/utils";

export function useMiningTimer(player: Player | null, onMessage: (msg: string) => void) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [isReadyToCollect, setIsReadyToCollect] = useState(false);
  
  const queryClient = useQueryClient();
  const collectMining = useCollectMining();

  useEffect(() => {
    if (!player || !player.miningStartedAt || player.miningQueued === 0) {
      setTimeLeft(null);
      setIsReadyToCollect(false);
      return;
    }

    const startedAt = new Date(player.miningStartedAt).getTime();
    const cycleSecs = player.cycleDurationSec;
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsedSecs = Math.floor((now - startedAt) / 1000);
      
      const cyclesDone = Math.min(
        Math.floor(elapsedSecs / cycleSecs), 
        player.miningQueued
      );
      
      setCompletedCycles(cyclesDone);
      
      if (cyclesDone >= player.miningQueued) {
        setTimeLeft(0);
        setIsReadyToCollect(true);
      } else {
        const nextCycleEndsAtSecs = (cyclesDone + 1) * cycleSecs;
        setTimeLeft(nextCycleEndsAtSecs - elapsedSecs);
        setIsReadyToCollect(cyclesDone > 0);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    
    return () => clearInterval(intervalId);
  }, [player]);

  const handleCollect = async () => {
    if (!isReadyToCollect) return;
    
    try {
      const res = await collectMining.mutateAsync();
      
      if (res && res.reward) {
        onMessage(`[SYSTEM] Collected rewards for ${res.reward.cycles} cycles.`);
        onMessage(`[REWARD] +${res.reward.credits} CR, +${res.reward.experience} XP.`);
        if (res.reward.leveledUp) {
          onMessage(`[LEVEL UP] You reached Mining Level ${res.reward.newLevel}!`);
        }
        res.reward.messages.forEach(msg => onMessage(`[MINING] ${msg}`));
      }
      
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: unknown) {
      onMessage(`[ERROR] Collection failed: ${extractErrorMessage(error) ?? "Unknown error"}`);
    }
  };

  return {
    timeLeft,
    completedCycles,
    isReadyToCollect,
    handleCollect,
    isCollecting: collectMining.isPending
  };
}
