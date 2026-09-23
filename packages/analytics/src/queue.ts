import type { AnalyticsEvent } from './types.js';
import { Logger } from './lib/logger.js';

/**
 * In-memory FIFO queue for analytics events.
 *
 * #1069 — basic enqueue/drain/size
 * #1073 — maxSize cap: drops oldest event and logs a warning on overflow
 */
export class EventQueue {
  private readonly events: AnalyticsEvent[] = [];

  constructor(
    private readonly maxSize: number = 0,
    private readonly logger: Logger = new Logger(false),
  ) {}

  enqueue(event: AnalyticsEvent): void {
    this.events.push(event);

    if (this.maxSize > 0 && this.events.length > this.maxSize) {
      const dropped = this.events.splice(0, 1)[0];
      this.logger.warn(
        `Max queue size (${this.maxSize}) exceeded — dropped oldest event: "${dropped.name}"`,
      );
    }
  }

  /** Removes and returns all queued events in FIFO order. */
  drain(): AnalyticsEvent[] {
    return this.events.splice(0, this.events.length);
  }

  get size(): number {
    return this.events.length;
  }
}
