import type { AnalyticsEvent } from './types.js';

/** A small time-window deduplicator used by the client pipeline. */
export class EventDeduplicator {
  private readonly seen = new Map<string, number>();

  constructor(private readonly windowMs = 0) {}

  isDuplicate(event: AnalyticsEvent, now = Date.now()): boolean {
    if (this.windowMs <= 0) return false;
    const key = `${event.name}:${JSON.stringify(event.properties)}`;
    const expiresAt = this.seen.get(key);
    if (expiresAt !== undefined && expiresAt > now) return true;
    this.seen.set(key, now + this.windowMs);
    this.prune(now);
    return false;
  }

  private prune(now: number): void {
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key);
    }
  }
}
