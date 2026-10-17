/** Window-based event deduplicator. Evicts entries older than windowMs. */
import type { AnalyticsEvent } from './types.js';

export class EventDeduplicator {
  /** Map of dedup key -> timestamp (ms) at which the key was last seen. */
  private readonly seen = new Map<string, number>();

  private readonly windowMs: number;

  constructor(windowMs: number = 5000) {
    this.windowMs = windowMs;
  }

  /**
   * Returns true if this event is a duplicate within the dedup window.
   *
   * `now` is injectable so callers can supply an event timestamp or a fake
   * clock; it defaults to `Date.now()`. Note that the *eviction* comparison
   * uses `now`, while the dedup key still includes `event.timestamp` — the
   * first is "how long have we been holding this", the second is "is this the
   * same event". Conflating them would make a replayed event with a fresh
   * timestamp collide with the original.
   */
  isDuplicate(event: AnalyticsEvent, now: number = Date.now()): boolean {
    // Evict entries that have aged out, so `seen` cannot grow without bound.
    // Only reached entries are checked, but this is O(n) over the map; with a
    // bounded window and one key per distinct event that stays small.
    for (const [key, ts] of this.seen) {
      if (now - ts > this.windowMs) {
        this.seen.delete(key);
      }
    }

    const key = JSON.stringify({
      name: event.name,
      properties: event.properties,
      timestamp: event.timestamp,
    });

    if (this.seen.has(key)) {
      return true;
    }

    this.seen.set(key, now);
    return false;
  }
}