import { AnalyticsEvent } from "./types/events";

/**
 * Event deduplication for the analytics pipeline.
 *
 * Rapid repeated firings of the same event (e.g. a double-click handler, or
 * a `page_view` re-emitted by two competing router listeners) are collapsed
 * into a single tracked event when they land within `DEDUP_WINDOW_MS` of
 * each other.
 */

/** Milliseconds within which a repeat of the same event is dropped. */
export const DEDUP_WINDOW_MS = 500;

/**
 * Identifies "the same event" for deduplication purposes: same event name
 * with the same properties. Two events with the same name but different
 * properties (e.g. `page_view` for different paths) are treated as
 * different events and are never deduplicated against each other.
 */
function eventKey(event: AnalyticsEvent): string {
  return `${event.name}:${JSON.stringify(event.properties ?? {})}`;
}

/**
 * Tracks recently-seen events and decides whether a new one is a duplicate.
 *
 * Stateful by design — one instance should live for the lifetime of the
 * analytics client, since deduplication only makes sense relative to
 * previously seen events. `now` is injectable so callers (and tests) don't
 * need to depend on wall-clock time.
 */
export class EventDeduplicator {
  private readonly lastSeenAt = new Map<string, number>();

  constructor(
    private readonly windowMs: number = DEDUP_WINDOW_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Returns `true` when `event` should be tracked (kept), `false` when it's
   * a duplicate of an event seen within the window and should be dropped.
   *
   * Whether kept or dropped, this call always updates the "last seen" time
   * for the event's key, so a rapid burst of 3+ duplicates only keeps the
   * first one — later ones don't get a fresh window just because an earlier
   * duplicate was also dropped.
   */
  shouldKeep(event: AnalyticsEvent): boolean {
    const key = eventKey(event);
    const now = this.now();
    const lastSeen = this.lastSeenAt.get(key);
    this.lastSeenAt.set(key, now);

    if (lastSeen !== undefined && now - lastSeen < this.windowMs) {
      return false;
    }
    return true;
  }

  /** Clears all tracked "last seen" state. */
  reset(): void {
    this.lastSeenAt.clear();
  }
}
