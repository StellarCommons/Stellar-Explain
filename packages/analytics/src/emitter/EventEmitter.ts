import { AnalyticsEvent, EventName } from "../types/events";

export type EventHandler = (event: AnalyticsEvent) => void;

export class EventEmitter {
  private queue: AnalyticsEvent[] = [];
  private handlers: Map<EventName, EventHandler[]> = new Map();
  private draining = false;

  on(eventName: EventName, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  off(eventName: EventName, handler: EventHandler): void {
    const existing = this.handlers.get(eventName);
    if (!existing) return;
    const filtered = existing.filter((h) => h !== handler);
    if (filtered.length === 0) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.set(eventName, filtered);
    }
  }

  track(event: AnalyticsEvent): void {
    if (!EventName.includes(event.name)) {
      console.warn(`Analytics: dropped unknown event "${event.name}"`);
      return;
    }
    this.queue.push(event);
    if (!this.draining) {
      this.draining = true;
      this.flush();
    }
  }

  flush(): void {
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      const handlers = this.handlers.get(event.name) ?? [];
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(
            `Analytics: handler error for "${event.name}"`,
            err,
          );
        }
      }
    }
    this.draining = false;
  }

  queueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}
