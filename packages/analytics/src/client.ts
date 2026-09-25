import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import type { AnalyticsConfig, ResolvedConfig } from './config.js';
import { EventDeduplicator } from './dedup.js';
import type { Emitter } from './emitter/index.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { Logger } from './lib/logger.js';
import { EventQueue } from './queue.js';
import { shouldSample } from './sampling.js';
import type { AnalyticsEvent } from './types.js';
import { limitPayload } from './utils/limitPayload.js';
import { validateProperties } from './validate.js';
import { scrubEventProperties } from './lib/scrubPii.js';
import { DeadLetterQueue } from './lib/DeadLetterQueue.js';
import type { CircuitState } from './lib/circuitBreaker.js';
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
 * #89  — track() scrubs PII from properties (enabled by default, config-disablable)
 * #90  — emitter failures are caught, logged and routed to the dead-letter
 * #91  — bounded dead-letter (oldest evicted on overflow)
 * #92  — flushSync() immediate best-effort send bypassing the queue/interval
 * Analytics #82 — exposes the emitter's circuit breaker state, when available
 * Analytics #84 — pauses flushing while offline, resumes on reconnect
 *
 * Stores whatever `config` it's given as-is (applying defaults only where
 * a field is used, via `??`) rather than re-resolving it — callers that
 * want a fully-resolved config up front can call `resolveConfig()`
 * themselves before constructing the client.
 * Analytics #66 — optional global `window.onerror` capture
 * Analytics #67 — trackNetworkError() for host-reported failed fetches
 * Analytics #68 — daily-active-user heartbeat on first activity
 */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly emitter: Emitter;
function generateId(): string {
  // Prefer crypto.randomUUID when available.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class AnalyticsClient {
  private readonly config: ResolvedConfig;
  private readonly queue: EventQueue;
  private readonly deadLetter: DeadLetterQueue;
  private readonly emitter: Emitter;
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;
  private isOffline: boolean;
  private onlineHandler: (() => void) | undefined;
  private offlineHandler: (() => void) | undefined;
  private globalErrorHandler: ((event: ErrorEvent) => void) | undefined;
  private hasFiredHeartbeatThisSession = false;

  constructor(config: Partial<AnalyticsConfig> = {}, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.deadLetter = new DeadLetterQueue(100, this.logger);
  constructor(config: AnalyticsConfig = {}, emitter?: Emitter) {
    this.config = config;
    this.logger = new Logger(this.config.debug ?? false);
    this.emitter = emitter ?? new NoopEmitter();
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.isOffline = typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false;

    // #1072 — start auto-flush timer if configured
    const flushIntervalMs = this.config.flushIntervalMs ?? 0;
    if (flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, flushIntervalMs);
    }

    // Analytics #66 — opt-in global error capture
    if (this.config.captureGlobalErrors) {
      this.bindGlobalErrorHandler();
    }

    // Analytics #84 — pause flushing while offline, resume on reconnect
    this.bindConnectivityHandlers();
  }
  private readonly dedup: EventDeduplicator;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

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
  constructor(config: AnalyticsConfig, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.queue = new EventQueue(this.config.maxQueueSize);
    this.emitter = emitter ?? new NoopEmitter();
    this.logger = new Logger(this.config.debug);
    this.dedup = new EventDeduplicator();

    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch((err) => this.logger.error('Auto-flush error:', err));
      }, this.config.flushInterval);
    }
    validateProperties(properties);

    this.maybeFireHeartbeat();

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
    this.unbindConnectivityHandlers();
    this.unbindGlobalErrorHandler();
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

  /** #91 — the bounded dead-letter holding events whose send failed. */
  getDeadLetter(): DeadLetterQueue {
    return this.deadLetter;
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

  /**
   * Records an event. Applies sampling → validation → payload limiting →
   * deduplication → beforeSend hook → enqueue.
   */
  track(name: string, properties: Record<string, unknown>): void {
    // 1. Sampling gate
    if (!shouldSample(this.config.sampleRate)) {
      this.logger.log(`[sampling] dropped event "${name}"`);
      return;
import type { AnalyticsConfig } from './config.js';
import { resolveConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { Logger } from './lib/logger.js';
import { EventQueue } from './queue.js';
import { EventDeduplicator } from './dedup.js';
import { shouldSample } from './sampling.js';
import { limitPayload } from './utils/limitPayload.js';
import { validateProperties } from './validate.js';
import type { Emitter } from './emitter/index.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { HttpSink } from './sinks/HttpSink.js';

export class AnalyticsClient {
  private readonly config: ReturnType<typeof resolveConfig>;
  private readonly logger: Logger;
  private readonly queue: EventQueue;
  private readonly deduplicator: EventDeduplicator;
  private readonly emitter: Emitter;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: AnalyticsConfig, emitter?: Emitter) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.deduplicator = new EventDeduplicator();
    this.emitter = emitter ?? new NoopEmitter();

    if (this.config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
    }

    // 2. Validate
    validateProperties(name, properties);

    // 3. Limit payload
    const limitedProps = limitPayload(properties, this.config.maxPropertyBytes, this.logger);

    // 4. Build event
    const timestamp = new Date().toISOString();
    let event: AnalyticsEvent = {
      id: generateId(),
      name,
      properties: limitedProps,
      timestamp,
    };

    // 5. Deduplication
    if (this.dedup.isDuplicate(name, limitedProps, timestamp)) {
      this.logger.log(`[dedup] dropped duplicate event "${name}"`);
      return;
    }

    // 6. beforeSend hook
    const mutated = this.config.beforeSend(event);
    if (mutated === null) {
      this.logger.log(`[beforeSend] cancelled event "${name}"`);
      return;
    }
    event = mutated;

    // 7. Enqueue
    this.queue.enqueue(event);
    this.logger.log(`[track] enqueued "${name}" (queue size: ${this.queue.size})`);
  }

  /** Drains the queue and delivers all pending events to the emitter. */
  async flush(): Promise<void> {
    const events = this.queue.drain();
    this.logger.log(`[flush] delivering ${events.length} event(s)`);
    for (const event of events) {
      this.emitter.send(event);
    }
  }

  /** Stops the auto-flush timer and releases resources. */
  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  track(name: string, properties: Record<string, unknown> = {}): void {
    // 1. Sampling gate
    if (!shouldSample(this.config.sampleRate)) {
      this.logger.debug(`Event "${name}" dropped by sampling (sampleRate=${this.config.sampleRate})`);
      return;
    }

    // 2. Validate then limit payload
    validateProperties(properties);
    const limitedProperties = limitPayload(properties, this.config.maxPropertyBytes, this.logger);

    // 3. Create event
    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties: limitedProperties,
    };

    // 4. Deduplication
    if (this.deduplicator.isDuplicate(event)) {
      this.logger.debug(`Event "${name}" dropped as duplicate`);
      return;
    }

    // 5. beforeSend hook
    if (this.config.beforeSend) {
      const result = this.config.beforeSend(event);
      if (result === null) {
        this.logger.debug(`Event "${name}" cancelled by beforeSend`);
        return;
      }
      this.queue.enqueue(result);
      return;
    }

    // 6. Enqueue
    this.queue.enqueue(event);
  }

  async flush(): Promise<void> {
    const events = this.queue.drain();
    for (const event of events) {
      try {
        await this.emitter.send(event);
      } catch (err) {
        this.logger.error('Failed to send event:', err);
      }
    }
  }

  destroy(): void {
    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  getDeadLetters(): AnalyticsEvent[] {
    if (this.emitter instanceof HttpSink) {
      return this.emitter.getDeadLetters();
    }
    return [];
  }
}