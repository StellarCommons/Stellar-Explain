/** Window-based event deduplicator. Evicts entries older than windowMs. */
import type { AnalyticsEvent } from './types.js';

export class EventDeduplicator {
  private readonly windowMs: number;
  private readonly seen = new Map<string, number>(); // key → timestamp

  constructor(private readonly windowMs: number = 5000) {}

  /** Returns true if this event is a duplicate within the dedup window. */
  isDuplicate(name: string, properties: Record<string, unknown>, timestamp: string): boolean {
    const now = new Date(timestamp).getTime();
    // Evict stale entries
    for (const [key, ts] of this.seen.entries()) {
      if (now - ts > this.windowMs) {
        this.seen.delete(key);
      }
    }
    const key = `${name}:${JSON.stringify(properties)}`;
    if (this.seen.has(key)) {
      return true;
    }
  constructor(windowMs = 500) {
    this.windowMs = windowMs;
  }

  isDuplicate(event: AnalyticsEvent): boolean {
    const key = JSON.stringify({ name: event.name, properties: event.properties, timestamp: event.timestamp });
    const now = Date.now();
    // Evict old entries
    for (const [k, ts] of this.seen) {
      if (now - ts > this.windowMs) this.seen.delete(k);
    }
    if (this.seen.has(key)) return true;
    this.seen.set(key, now);
    return false;
  }
}
