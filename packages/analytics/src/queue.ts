import type { AnalyticsEvent } from './types.js';
import { Logger } from './lib/logger.js';

/**
 * In-memory FIFO queue for analytics events.
 *
 * #1069 — basic enqueue/drain/size
 * #1073 — maxSize cap: drops the oldest event and logs a warning on overflow
 */
export class EventQueue {
  private readonly events: AnalyticsEvent[] = [];
  private readonly maxSize: number;
  private readonly logger: Logger;

  constructor(maxSize: number = 0, logger?: Logger) {
    this.maxSize = maxSize;
    this.logger = logger ?? new Logger(false);
  }

  /**
   * Append an event. When `maxSize > 0` and the queue is full the oldest
   * event is dropped and a warning is logged.
   */
  enqueue(event: AnalyticsEvent): void {
    this.events.push(event);

    if (this.maxSize > 0 && this.events.length > this.maxSize) {
      const dropped = this.events.shift()!;
      this.logger.warn(
        `Max queue size (${this.maxSize}) exceeded — dropped oldest event: "${dropped.name}"`,
      );
    }
  }

  /** Removes and returns all queued events in FIFO order. */
  drain(): AnalyticsEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** Returns a shallow copy of the queued events without draining them. */
  peek(): AnalyticsEvent[] {
    return [...this.events];
  }

  /** Number of events currently queued. */
  get size(): number {
    return this.events.length;
  }
}