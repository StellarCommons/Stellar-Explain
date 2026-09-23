/** Window-based event deduplicator. Evicts entries older than windowMs. */
export class EventDeduplicator {
  private readonly seen = new Map<string, number>();

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
    this.seen.set(key, now);
    return false;
  }
}
