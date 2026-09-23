import type { AnalyticsEvent } from './types.js';

/** FIFO queue with overflow protection (oldest-first eviction). */
export class EventQueue {
  private readonly items: AnalyticsEvent[] = [];

  constructor(private readonly maxSize: number = 100) {}

  enqueue(event: AnalyticsEvent): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift(); // evict oldest
    }
    this.items.push(event);
  }

  /** Drains and returns all queued events, clearing the queue. */
  drain(): AnalyticsEvent[] {
    return this.items.splice(0, this.items.length);
  }

  get size(): number {
    return this.items.length;
  }
}
