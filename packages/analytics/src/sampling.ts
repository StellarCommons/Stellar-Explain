/** Decide whether an event passes the configured sampling stage. */
export function shouldSample(rate: number, random: () => number = Math.random): boolean {
  const normalized = Math.min(1, Math.max(0, rate));
  if (normalized >= 1) return true;
  if (normalized <= 0) return false;
  return random() < normalized;
}
