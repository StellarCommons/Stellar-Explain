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
  private readonly logger?: Logger;

  /**
   * @param maxSize - Cap on queued events. `0` (the default) means unlimited.
   *   Defaulting to unlimited rather than a finite number is deliberate: a bare
   *   `new EventQueue()` is used in tests and by callers that manage their own
   *   retention, and silently capping it would make eviction invisible. The
   *   client passes `config.maxQueueSize` (default 100) explicitly.
   * @param logger - Optional; when omitted, overflow is silent.
   */
  constructor(maxSize: number = 0, logger?: Logger) {
    this.maxSize = maxSize;
    this.logger = logger;
  }

  /**
   * Append an event. When `maxSize > 0` and the queue is full the oldest
   * event is dropped and a warning is logged.
   */
  enqueue(event: AnalyticsEvent): void {
    if (this.maxSize > 0 && this.events.length >= this.maxSize) {
      const dropped = this.events.shift();
      this.logger?.warn(
        `Queue full (max ${this.maxSize}) — dropped oldest event: "${dropped?.name ?? 'unknown'}"`,
      );
    }
    this.events.push(event);
  }

  /** Drains and returns all queued events, clearing the queue. */
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