import type { AnalyticsConfig } from './config.js';
import { resolveConfig } from './config.js';
import type { Emitter } from './emitter/index.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { Logger } from './lib/logger.js';
import type { AnalyticsEvent } from './types.js';
import { validateProperties } from './validate.js';
import { EventQueue } from './queue.js';

export class AnalyticsClient {
  private readonly config: AnalyticsConfig;
  private readonly emitter: Emitter;
  private readonly logger: Logger;
  private readonly queue: EventQueue;

  constructor(config?: Partial<AnalyticsConfig>, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.emitter = emitter ?? new NoopEmitter();
    this.logger = new Logger(this.config.debug);
    this.queue = new EventQueue();
  }

  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string');
    }

    validateProperties(properties);

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };

    this.logger.debug('track()', event);

    // Route through the queue instead of calling emitter directly (#1070).
    // Emitter will be called during flush() in a subsequent issue.
    this.queue.enqueue(event);
  }

  /**
   * Returns the internal queue instance.
   * Used by tests and future flush() implementation.
   */
  getQueue(): EventQueue {
    return this.queue;
  }

  /**
   * Returns the configured emitter.
   * Used by tests and future flush() implementation.
   */
  getEmitter(): Emitter {
    return this.emitter;
  }
}
