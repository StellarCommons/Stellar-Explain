import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';

/**
 * Main analytics client.
 *
 * #1067 — accepts a custom Emitter (defaults to NoopEmitter)
 * #1068 — barrel-exported
 * #1069 — holds an EventQueue; track() enqueues instead of forwarding directly
 * #1070 — track() routes events through the queue
 * #1071 — flush() drains the queue to the emitter
 * #1072 — optional auto-flush timer; stoppable via destroy()
 * #1073 — max-queue-size cap delegated to EventQueue
 */
export class AnalyticsClient {
  private readonly config: Required<AnalyticsConfig>;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(config: AnalyticsConfig = {}, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);

    // #1072 — start auto-flush timer if configured
    if (this.config.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  /**
   * Enqueue a tracking event.
   *
   * Throws a TypeError if `name` is blank or `properties` are invalid.
   */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string.');
    }
    validateProperties(properties);

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };

    this.queue.enqueue(event);
    this.logger.debug(`tracked event "${name}"`);
  }

  /**
   * #1071 — Drain the queue and forward every event to the emitter.
   */
  async flush(): Promise<void> {
    const events = this.queue.drain();
    await Promise.all(events.map((e) => this.emitter.send(e)));
  }

  /**
   * #1072 — Stop the auto-flush interval and perform a final flush.
   */
  destroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    void this.flush();
  }

  // ── test / inspection helpers ──────────────────────────────────────────────

  getEmitter(): Emitter {
    return this.emitter;
  }

  getQueue(): EventQueue {
    return this.queue;
  }
}
