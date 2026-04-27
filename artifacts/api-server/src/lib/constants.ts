export const CYCLE_DURATION_SEC = 30;
export const CREDITS_PER_CYCLE = 25;
export const XP_PER_CYCLE = 10;

export function xpForLevel(level: number): number {
  return level * 100;
}
