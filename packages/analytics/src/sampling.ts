/**
 * Returns true if the event should be sampled in.
 * @param sampleRate - 0 = never, 1 = always, 0.5 = ~50% of events.
 */
export function shouldSample(sampleRate: number): boolean {
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;
  return Math.random() < sampleRate;
}
