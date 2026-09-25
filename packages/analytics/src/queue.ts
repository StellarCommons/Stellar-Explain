import type { AnalyticsEvent } from './types.js';
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

  get size(): number {
    return this.queue.length;
  }
}
