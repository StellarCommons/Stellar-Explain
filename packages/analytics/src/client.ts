import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import { scrubEventProperties } from './lib/scrubPii.js';
import { DeadLetterQueue } from './lib/DeadLetterQueue.js';

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
 * #89  — track() scrubs PII from properties (enabled by default, config-disablable)
 * #90  — emitter failures are caught, logged and routed to the dead-letter
 * #91  — bounded dead-letter (oldest evicted on overflow)
 * #92  — flushSync() immediate best-effort send bypassing the queue/interval
 */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly deadLetter: DeadLetterQueue;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(config: Partial<AnalyticsConfig> = {}, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.deadLetter = new DeadLetterQueue(100, this.logger);

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
   *
   * #89 — unless explicitly disabled via `config.scrubPii === false`,
   * email/number PII is scrubbed from `properties` before enqueuing.
   */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string.');
    }
    validateProperties(properties);

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties:
        this.config.scrubPii !== false ? scrubEventProperties(properties) : properties,
    };

    this.queue.enqueue(event);
    this.logger.debug(`tracked event "${name}"`);
  }

  /**
   * #1071, #90 — Drain the queue and forward every event to the emitter.
   *
   * #90: individual emitter failures are caught and logged, and the failed
   * event is routed to the dead-letter (#91); `flush()` never rejects.
   */
  async flush(): Promise<void> {
    const events = this.queue.drain();
    await Promise.all(
      events.map(async (event) => {
        try {
          await this.emitter.send(event);
        } catch (error) {
          this.logger.error(`emit failed for "${event.name}"`, error);
          this.deadLetter.push(event);
        }
      }),
    );
  }

  /**
   * #92 — Send immediately, bypassing the queue and the auto-flush interval.
   *
   * With an event argument the event is sent directly (never enqueued).
   * Without an argument the pending queue is drained and sent as-is.
   * Failures are swallowed (best-effort) and routed to the dead-letter.
   */
  flushSync(event?: AnalyticsEvent): void {
    const pending = event ? [event] : this.queue.drain();
    for (const item of pending) {
      try {
        const result = this.emitter.send(item);
        if (result && typeof (result as Promise<void>).then === 'function') {
          void (result as Promise<void>).catch((error: unknown) => {
            this.logger.error(`emit failed for "${item.name}"`, error);
            this.deadLetter.push(item);
          });
        }
      } catch (error) {
        this.logger.error(`emit failed for "${item.name}"`, error);
        this.deadLetter.push(item);
      }
    }
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

  /** #91 — the bounded dead-letter holding events whose send failed. */
  getDeadLetter(): DeadLetterQueue {
    return this.deadLetter;
  }
}