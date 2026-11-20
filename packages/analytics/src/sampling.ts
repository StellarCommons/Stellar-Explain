/**
 * Returns true if the event should be sampled in.
 * @param sampleRate - 0 = never, 1 = always, 0.5 = ~50% of events.
 */
export function shouldSample(sampleRate: number): boolean {
  // The range checks are written as "clamp to 0..1" rather than
  // "validate the input": a sampleRate of 1.5 or -0.5 comes from config
  // arithmetic (e.g. a percentage divided by 100) far more often than it comes
  // from a mistake, and dropping every event or every event is a much worse
  // failure than sampling the intended fraction.
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  // Strictly less than: `Math.random() === sampleRate` is not "sampled in", so
  // the realised rate stays below the requested one rather than above it.
  return Math.random() < sampleRate;
}