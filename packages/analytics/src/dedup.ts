import type { AnalyticsEvent } from './types.js';

export class EventDeduplicator {
  private readonly windowMs: number;
  private readonly seen = new Map<string, number>(); // key → timestamp

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
