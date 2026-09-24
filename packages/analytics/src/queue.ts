import type { AnalyticsEvent } from './types.js';
import { Logger } from './lib/logger.js';

export type QueueDropReason = 'max-size' | 'cleared';

/** In-memory FIFO queue for analytics events. */
export class EventQueue {
  private readonly events: AnalyticsEvent[] = [];

  constructor(
    private readonly maxSize = 0,
    private readonly logger: Logger = new Logger(false),
    private readonly onDrop?: (event: AnalyticsEvent, reason: QueueDropReason) => void,
  ) {}

  enqueue(event: AnalyticsEvent): void {
    this.events.push(event);

    if (this.maxSize > 0 && this.events.length > this.maxSize) {
      const dropped = this.events.shift();
      if (dropped) {
        const message = `Max queue size (${this.maxSize}) exceeded — dropped oldest event: "${dropped.name}"`;
        this.logger.warn(message);
        this.logger.log('warn', 'queue.drop', {
          reason: 'max-size',
          maxSize: this.maxSize,
          eventName: dropped.name,
        });
        this.onDrop?.(dropped, 'max-size');
      }
    } else {
      this.logger.log('debug', 'queue.enqueue', {
        size: this.events.length,
        eventName: event.name,
      });
    }
  }

  /** Removes and returns all queued events in FIFO order. */
  drain(): AnalyticsEvent[] {
    const drained = this.events.splice(0, this.events.length);
    this.logger.log('debug', 'queue.drain', { count: drained.length });
    return drained;
  }

  clear(): void {
    const cleared = this.events.splice(0, this.events.length);
    for (const event of cleared) this.onDrop?.(event, 'cleared');
  }

  get size(): number {
    return this.events.length;
  }
}
