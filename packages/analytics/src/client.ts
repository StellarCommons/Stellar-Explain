import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import type { CircuitState } from './lib/circuitBreaker.js';

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
 * Analytics #82 — exposes the emitter's circuit breaker state, when available
 * Analytics #84 — pauses flushing while offline, resumes on reconnect
 */
export class AnalyticsClient {
  private readonly config: Required<AnalyticsConfig>;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;
  private isOffline: boolean;
  private onlineHandler: (() => void) | undefined;
  private offlineHandler: (() => void) | undefined;

  constructor(config: AnalyticsConfig = {}, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.isOffline = typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false;

    // #1072 — start auto-flush timer if configured
    if (this.config.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
    }

    // Analytics #84 — pause flushing while offline, resume on reconnect
    this.bindConnectivityHandlers();
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
   *
   * Analytics #84 — while offline, this is a no-op: events stay queued
   * until connectivity is restored, at which point a flush is triggered
   * automatically.
   */
  async flush(): Promise<void> {
    if (this.isOffline) {
      this.logger.debug('flush() skipped — offline');
      return;
    }

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
    this.unbindConnectivityHandlers();
    void this.flush();
  }

  /**
   * Analytics #82 — the current circuit breaker state of the configured
   * emitter, when it exposes one (e.g. `HttpSink`). Returns `undefined`
   * for emitters that don't use a circuit breaker.
   */
  getCircuitState(): CircuitState | undefined {
    const emitter = this.emitter as Partial<{ getCircuitState(): CircuitState }>;
    return typeof emitter.getCircuitState === 'function' ? emitter.getCircuitState() : undefined;
  }

  // ── test / inspection helpers ──────────────────────────────────────────────

  getEmitter(): Emitter {
    return this.emitter;
  }

  getQueue(): EventQueue {
    return this.queue;
  }

  // ── Analytics #84 internals ─────────────────────────────────────────────────

  private bindConnectivityHandlers(): void {
    if (typeof window === 'undefined') return;

    this.offlineHandler = () => {
      this.isOffline = true;
      this.logger.debug('offline — pausing flush');
    };
    this.onlineHandler = () => {
      this.isOffline = false;
      this.logger.debug('online — resuming flush');
      void this.flush();
    };

    window.addEventListener('offline', this.offlineHandler);
    window.addEventListener('online', this.onlineHandler);
  }

  private unbindConnectivityHandlers(): void {
    if (typeof window === 'undefined') return;

    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = undefined;
    }
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = undefined;
    }
  }
}
