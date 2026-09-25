import type { AnalyticsEvent } from '../types.js';
import { Logger } from './logger.js';

/**
 * A bounded dead-letter holding events that failed to send.
 *
 * Newest events are always retained; when the cap is reached the oldest
 * event is dropped (with a warning) so the dead-letter never grows unbounded.
 * #91 — a bounded dead-letter holding events that failed to send.
 *
 * Newest events are always retained; when the cap is reached the oldest
 * event is dropped (with a warning) so the dead-letter can never grow
 * unbounded.
 */
export class DeadLetterQueue {
  private readonly events: AnalyticsEvent[] = [];
  private readonly logger: Logger;

  constructor(private readonly maxSize: number = 100, logger?: Logger) {
    this.logger = logger ?? new Logger(false);
  }

  /**
   * Record a failed event. When the queue is full the oldest event is
   * evicted to make room.
   */
  push(event: AnalyticsEvent): void {
    if (this.maxSize > 0 && this.events.length >= this.maxSize) {
      const dropped = this.events.shift()!;
      this.logger.warn(
        `Dead-letter cap (${this.maxSize}) reached — dropped oldest event: "${dropped.name}"`,
      );
    }
    this.events.push(event);
  }

  /** Removes and returns all dead-lettered events. */
  drain(): AnalyticsEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** Number of events currently in the dead-letter. */
  get size(): number {
    return this.events.length;
  }
}