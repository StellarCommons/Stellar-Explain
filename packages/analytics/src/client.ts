import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import { RateLimiter } from './lib/rateLimiter.js';
import { CircuitBreaker } from './lib/CircuitBreaker.js';
import { DeadLetterQueue } from './lib/DeadLetterQueue.js';
import { clearPersistedQueue, loadPersistedQueue } from './lib/queuePersistence.js';

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
 * #93  — client-side rate limiting; over-budget events are dropped + warned
 * #94  — a circuit breaker guards the emitter from repeated failures
 * #95  — persisted queue is restored again on construction (offline coverage)
 */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly deadLetter: DeadLetterQueue;
  private readonly rateLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(config: Partial<AnalyticsConfig> = {}, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.deadLetter = new DeadLetterQueue(100, this.logger);
    this.rateLimiter = new RateLimiter(this.config.maxEventsPerSecond ?? 100);
    this.circuitBreaker = new CircuitBreaker();

    // Restore any queue persisted across a page unload.
    const restored = loadPersistedQueue();
    if (restored.length > 0) {
      clearPersistedQueue();
      for (const event of restored) {
        this.queue.enqueue(event);
      }
      void this.flush();
    }

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
   * #93 — when the event would exceed the configured rate, it is dropped
   * (with a warning) instead of being enqueued.
   */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string.');
    }
    validateProperties(properties);

    if (!this.rateLimiter.allow()) {
      this.logger.warn(
        `analytics rate limit (${this.config.maxEventsPerSecond ?? 100} events/s) exceeded — dropped event "${name}"`,
      );
      return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };

    this.queue.enqueue(event);
    this.logger.debug(`tracked event "${name}"`);
  }

  /**
   * #1071, #94 — Drain the queue and forward every event to the emitter.
   *
   * The circuit breaker short-circuits the emitter once the failure
   * threshold is crossed; events that cannot be sent are routed to the
   * dead-letter. `flush()` never rejects.
   */
  async flush(): Promise<void> {
    const events = this.queue.drain();
    await Promise.all(
      events.map(async (event) => {
        if (!this.circuitBreaker.allowRequest()) {
          this.logger.warn(`circuit open — ${event.name} deferred to dead-letter`);
          this.deadLetter.push(event);
          return;
        }
        try {
          await this.emitter.send(event);
          this.circuitBreaker.onSuccess();
        } catch (error) {
          this.circuitBreaker.onFailure();
          this.logger.error(`emit failed for "${event.name}"`, error);
          this.deadLetter.push(event);
        }
      }),
    );
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

  getDeadLetter(): DeadLetterQueue {
    return this.deadLetter;
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }
}