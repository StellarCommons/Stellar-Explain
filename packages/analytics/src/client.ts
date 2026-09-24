import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import { createErrorEvent } from './events/error.js';
import { createNetworkErrorEvent } from './events/network-error.js';
import { createHeartbeatEvent, shouldFireHeartbeat } from './events/heartbeat.js';

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
 * Analytics #66 — optional global `window.onerror` capture
 * Analytics #67 — trackNetworkError() for host-reported failed fetches
 * Analytics #68 — daily-active-user heartbeat on first activity
 */
export class AnalyticsClient {
  private readonly config: Required<AnalyticsConfig>;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;
  private globalErrorHandler: ((event: ErrorEvent) => void) | undefined;
  private hasFiredHeartbeatThisSession = false;

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

    // Analytics #66 — opt-in global error capture
    if (this.config.captureGlobalErrors) {
      this.bindGlobalErrorHandler();
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

    this.maybeFireHeartbeat();

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };

    this.queue.enqueue(event);
    this.logger.debug(`tracked event "${name}"`);
  }

  /**
   * Analytics #68 — fire a `daily_active_user` heartbeat once per client
   * instance, on first activity, deduped against localStorage so it fires
   * at most once per day per user across sessions.
   */
  private maybeFireHeartbeat(): void {
    if (this.hasFiredHeartbeatThisSession) return;
    this.hasFiredHeartbeatThisSession = true;

    if (shouldFireHeartbeat()) {
      this.queue.enqueue(createHeartbeatEvent());
      this.logger.debug('tracked heartbeat "daily_active_user"');
    }
  }

  /**
   * Analytics #66 — track an error directly (used internally by the
   * `window.onerror` handler, but also callable by a host app that wants
   * to report a caught error without relying on the global listener).
   */
  trackError(message: string, stack?: string): void {
    this.queue.enqueue(createErrorEvent(message, stack));
    this.logger.debug(`tracked error "${message}"`);
  }

  /**
   * Analytics #67 — track a failed `fetch`/network call. The host app is
   * responsible for calling this from its own fetch wrapper/interceptor,
   * since the analytics package doesn't patch `fetch` itself.
   */
  trackNetworkError(url: string, status?: number, message?: string): void {
    this.queue.enqueue(createNetworkErrorEvent(url, status, message));
    this.logger.debug(`tracked network error for "${url}"`);
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
    this.unbindGlobalErrorHandler();
    void this.flush();
  }

  // ── test / inspection helpers ──────────────────────────────────────────────

  getEmitter(): Emitter {
    return this.emitter;
  }

  getQueue(): EventQueue {
    return this.queue;
  }

  // ── Analytics #66 internals ─────────────────────────────────────────────────

  private bindGlobalErrorHandler(): void {
    if (typeof window === 'undefined' || this.globalErrorHandler) return;

    this.globalErrorHandler = (event: ErrorEvent) => {
      const message = event.message || 'Unknown error';
      const stack = event.error instanceof Error ? event.error.stack : undefined;
      this.trackError(message, stack);
    };
    window.addEventListener('error', this.globalErrorHandler);
  }

  private unbindGlobalErrorHandler(): void {
    if (typeof window === 'undefined' || !this.globalErrorHandler) return;
    window.removeEventListener('error', this.globalErrorHandler);
    this.globalErrorHandler = undefined;
  }
}
