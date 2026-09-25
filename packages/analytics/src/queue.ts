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

/** FIFO queue with overflow protection (oldest-first eviction). */
export class EventQueue {
  private readonly items: AnalyticsEvent[] = [];

  constructor(private readonly maxSize: number = 100) {}

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
    if (this.items.length >= this.maxSize) {
      this.items.shift(); // evict oldest
    }
    this.items.push(event);
  }

  /** Drains and returns all queued events, clearing the queue. */
  drain(): AnalyticsEvent[] {
    return this.items.splice(0, this.items.length);
  }

  /** Removes and returns all queued events in FIFO order. */
  get size(): number {
    return this.items.length;
import type { Logger } from './lib/logger.js';

export class EventQueue {
  private readonly queue: AnalyticsEvent[] = [];
  private readonly maxSize: number;
  private readonly logger: Logger;

  constructor(maxSize: number, logger: Logger) {
    this.maxSize = maxSize;
    this.logger = logger;
  }

  get size(): number {
    return this.queue.length;
  }

  enqueue(event: AnalyticsEvent): void {
    if (this.queue.length >= this.maxSize) {
      const dropped = this.queue.shift();
      this.logger.warn(`Queue full (max ${this.maxSize}), dropping oldest event: ${dropped?.name}`);
    }
    this.queue.push(event);
  }

  drain(): AnalyticsEvent[] {
    return this.queue.splice(0, this.queue.length);
  private readonly logger?: Logger;

  constructor(maxSize = 0, logger?: Logger) {
    this.maxSize = maxSize;
    this.logger = logger;
  }

  enqueue(event: AnalyticsEvent): void {
    if (this.maxSize > 0 && this.queue.length >= this.maxSize) {
      const dropped = this.queue.shift();
      this.logger?.warn(`Queue full (max ${this.maxSize}); dropping oldest event: "${dropped?.name}"`);
    }
    this.queue.push(event);
  }

  drain(): AnalyticsEvent[] {
    return this.queue.splice(0, this.queue.length);
  }

  /** Number of events currently queued. */
  get size(): number {
    return this.queue.length;
  }
}