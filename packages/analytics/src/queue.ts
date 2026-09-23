import type { AnalyticsEvent } from './types.js';

export class EventQueue {
  private readonly events: AnalyticsEvent[] = [];

  enqueue(event: AnalyticsEvent): void {
    this.events.push(event);
  }

  drain(): AnalyticsEvent[] {
    return this.events.splice(0, this.events.length);
  }

  get size(): number {
    return this.events.length;
  }
}
