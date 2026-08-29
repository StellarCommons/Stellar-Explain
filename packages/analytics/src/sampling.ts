/**
 * Event sampling for high-traffic cost control.
 *
 * A `sampleRate` of `1` keeps every event (the default); `0` drops every
 * event; values in between keep that fraction of events, chosen at random
 * per-event.
 */

/**
 * Returns `true` when an event at the given `rate` should be kept.
 *
 * `rate` is clamped to `[0, 1]` so a caller-supplied out-of-range value
 * (e.g. `1.5`, `-1`) degrades to "keep everything" / "drop everything"
 * rather than producing surprising `Math.random() < rate` behavior.
 */
export function shouldSample(rate: number): boolean {
  const clamped = Math.min(1, Math.max(0, rate));
  return Math.random() < clamped;
}
