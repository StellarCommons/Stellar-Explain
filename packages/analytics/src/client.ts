import type { AnalyticsConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { EventQueue } from './queue.js';
import { shouldSample } from './sampling.js';
import { limitPayload } from './utils/limitPayload.js';
import { validateProperties } from './validate.js';
import type { Emitter } from './emitter/index.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { MultiSink } from './sinks/MultiSink.js';
import { Logger } from './lib/logger.js';
import { RateLimiter } from './lib/rateLimiter.js';
import { CircuitBreaker } from './lib/circuitBreaker.js';
import type { CircuitState } from './lib/circuitBreaker.js';
import { DeadLetterQueue } from './lib/DeadLetterQueue.js';
import {
  clearPersistedQueue,
  loadPersistedQueue,
  persistPendingQueue,
} from './lib/queuePersistence.js';
import { scrubEventProperties } from './lib/scrubPii.js';
import type { Plugin } from './plugins.js';
import { PluginRegistry } from './plugins.js';
import { Middleware } from './middleware.js';
import { createErrorEvent } from './events/error.js';
import { createNetworkErrorEvent } from './events/network-error.js';

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
 * #97  — accepts an Emitter or an array of Emitters (fanned out via MultiSink)
 * #98  — plugins registered with beforeSend hooks
 * #99  — a Middleware pipeline composes beforeSend hooks and runs each event through it
 * #85  — persists the pending queue to localStorage on `beforeunload`
 * #86  — restores a persisted queue on construction and re-flushes it
 * #93  — client-side rate limiting; over-budget events are dropped + warned
 * #94  — a circuit breaker guards the emitter from repeated failures
 * #89  — track() scrubs PII from properties (enabled by default, config-disablable)
 * #90  — emitter failures are caught, logged and routed to the dead-letter
 * #91  — bounded dead-letter (oldest evicted on overflow)
 * #92  — flushSync() immediate best-effort send bypassing the queue/interval
 * Analytics #82 — exposes the emitter's circuit breaker state, when available
 * Analytics #84 — pauses flushing while offline, resumes on reconnect
 * Analytics #66 — optional global `window.onerror` capture
 * Analytics #67 — trackNetworkError() for host-reported failed fetches
 */
export class AnalyticsClient {
  /**
   * Typed as {@link ResolvedConfig} because every field the client reads is
   * one `resolveConfig` guarantees to populate. `resolveConfig`'s own return
   * type is the looser `AnalyticsConfig` — it must accept partial input — so
   * the widening here is deliberate: without it, `this.config.beforeSend` and
   * `this.config.maxEventsPerSecond` are `T | undefined` at every use site and
   * the client has to sprinkle `!` or `?.` over values that are in fact always
   * present. `resolveConfig` cannot return a config missing these fields, so
   * this is a statement about the caller's guarantee, not an unchecked cast.
   */
  private readonly config: ResolvedConfig;
  private readonly queue: EventQueue;
  private readonly deadLetter: DeadLetterQueue;
  private readonly rateLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly emitter: Emitter;
  private readonly logger: Logger;
  private readonly plugins = new PluginRegistry();
  private readonly middleware = new Middleware();

  /**
   * The single auto-flush interval.
   *
   * There is exactly one timer field and one `setInterval` call in this class.
   * The file this replaces had two (`timer` and `flushTimer`, each with its own
   * interval), which meant a client could be flushing on two schedules at once
   * and `destroy()` only ever cleared one of them — leaving a live interval
   * holding the client, its emitter and its queued events in memory.
   */
  private timer: ReturnType<typeof setInterval> | undefined;

  private isOffline: boolean;
  private onlineHandler: (() => void) | undefined;
  private offlineHandler: (() => void) | undefined;
  private globalErrorHandler: ((event: ErrorEvent) => void) | undefined;

  constructor(config: Partial<AnalyticsConfig> = {}, emitter?: Emitter | Emitter[]) {
    this.config = resolveConfig(config) as ResolvedConfig;
    this.logger = new Logger(this.config.debug);
    this.emitter = this.buildEmitter(emitter);
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.deadLetter = new DeadLetterQueue(100, this.logger);
    this.rateLimiter = new RateLimiter(this.config.maxEventsPerSecond);
    this.circuitBreaker = new CircuitBreaker();

    this.isOffline =
      typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false;

    // #86 — restore any queue persisted by #85 across a page unload.
    const restored = loadPersistedQueue();
    if (restored.length > 0) {
      clearPersistedQueue();
      for (const event of restored) {
        this.queue.enqueue(event);
      }
      this.logger.debug(`restored ${restored.length} persisted events`);
      void this.flush();
    }

    // #72/#1072 — start the auto-flush timer if configured.
    if (this.config.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
      // Unref the timer where supported (Node) so it does not keep the process
      // alive; browsers return a numeric id with no unref, which is a no-op.
      (this.timer as { unref?: () => void }).unref?.();
    }

    // Analytics #66 — opt-in global error capture.
    if (this.config.captureGlobalErrors) {
      this.bindGlobalErrorHandler();
    }

    // #85 — persist the pending queue when the page is torn down.
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    // Analytics #84 — pause flushing while offline, resume on reconnect.
    this.bindConnectivityHandlers();
  }

  private readonly handleBeforeUnload = (): void => {
    this.persistQueueNow();
  };

  /**
   * #97 — normalize the emitter argument: no emitter → NoopEmitter,
   * a single emitter → itself, an array → MultiSink fan-out.
   *
   * A one-element array is unwrapped to that emitter rather than wrapped in a
   * MultiSink, so `getEmitter()` returns what the caller passed.
   */
  private buildEmitter(emitter?: Emitter | Emitter[]): Emitter {
    if (Array.isArray(emitter)) {
      if (emitter.length === 0) return new NoopEmitter();
      if (emitter.length === 1) return emitter[0];
      return new MultiSink(emitter);
    }
    return emitter ?? new NoopEmitter();
  }

  /**
   * Enqueue a tracking event.
   *
   * Throws a `TypeError` if `name` is blank or `properties` are invalid.
   *
   * #93 — when the event would exceed the configured rate, it is dropped
   * (with a warning) instead of being enqueued.
   * #89 — unless explicitly disabled via `config.scrubPii === false`,
   * email/number PII is scrubbed from `properties` before enqueuing.
   *
   * The empty-name check lives here rather than in `validateProperties`
   * because that function only ever receives `properties`; see #1243.
   */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string.');
    }

    // 1. Sampling gate.
    if (!shouldSample(this.config.sampleRate)) {
      this.logger.debug(`event "${name}" dropped by sampling`);
      return;
    }

    // 2. Validate, then bound each property's serialized size.
    validateProperties(properties);
    const limited = limitPayload(properties, this.config.maxPropertyBytes, this.logger);

    // 3. Scrub PII from values (keys are left intact so structure survives).
    const scrubbed =
      this.config.scrubPii !== false ? scrubEventProperties(limited) : limited;

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties: scrubbed,
    };

    // 4. Rate limiting (#93).
    if (!this.rateLimiter.allow()) {
      this.logger.warn(
        `analytics rate limit (${this.config.maxEventsPerSecond} events/s) exceeded — dropped event "${name}"`,
      );
      return;
    }

    // 5. beforeSend hook. `null` cancels the event; it is never enqueued.
    const prepared = this.config.beforeSend(event);
    if (prepared === null) {
      this.logger.debug(`event "${name}" cancelled by beforeSend`);
      return;
    }

    // 6. Enqueue.
    this.queue.enqueue(prepared);
    this.logger.debug(`tracked event "${name}"`);
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
   * #1071, #99 — Drain the queue, run each event through the middleware
   * pipeline, then forward it to the emitter(s).
   *
   * #90/#94 — the circuit breaker short-circuits the emitter once the failure
   * threshold is crossed; events that cannot be sent are routed to the
   * dead-letter (#91). `flush()` never rejects: a caller flushing on a timer or
   * in a `beforeunload` handler has nowhere to put a rejection.
   *
   * Analytics #84 — while offline this is a no-op; events stay queued until
   * connectivity is restored, at which point a flush is triggered.
   */
  async flush(): Promise<void> {
    if (this.isOffline) {
      this.logger.debug('offline — flush deferred');
      return;
    }

    const events = this.queue.drain();
    if (events.length === 0) return;

    await Promise.all(
      events.map(async (event) => {
        let prepared: AnalyticsEvent;
        try {
          prepared = await this.middleware.process(event);
        } catch (error) {
          // A throwing middleware hook must not lose the event.
          this.logger.error(`middleware failed for "${event.name}"`, error);
          this.deadLetter.push(event);
          return;
        }

        if (!this.circuitBreaker.canProceed()) {
          this.logger.warn(`circuit open — "${prepared.name}" routed to dead-letter`);
          this.deadLetter.push(prepared);
          return;
        }

        try {
          await this.emitter.send(prepared);
          this.circuitBreaker.recordSuccess();
        } catch (error) {
          this.circuitBreaker.recordFailure();
          this.logger.error(`emit failed for "${prepared.name}"`, error);
          this.deadLetter.push(prepared);
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
        // An emitter may be sync (void) or async (Promise<void>); only the
        // latter can reject, and a rejection cannot be caught synchronously.
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
   * #72/#1072 — Stop the auto-flush interval and perform a final flush.
   */
  destroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.unbindConnectivityHandlers();
    this.unbindGlobalErrorHandler();
    void this.flush();
  }

  /**
   * #85 — Immediately persist the currently pending (undrained) queue.
   * Returns whether the events were handed to storage.
   */
  persistQueueNow(): boolean {
    return persistPendingQueue(this.queue.peek());
  }

  /**
   * #98 — Register a plugin and wire its beforeSend hook into the
   * middleware pipeline. Plugins run in registration order.
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.register(plugin);
    this.middleware.fromPlugin(plugin);
  }

  /** #98 — snapshot of registered plugins. */
  getPlugins(): Plugin[] {
    return this.plugins.getPlugins();
  }

  // ── test / inspection helpers ──────────────────────────────────────────────

  getEmitter(): Emitter {
    return this.emitter;
  }

  getQueue(): EventQueue {
    return this.queue;
  }

  /**
   * The client's own dead-letter queue — events whose delivery failed or was
   * short-circuited by the circuit breaker.
   *
   * Prefer this over {@link AnalyticsClient.getDeadLetters}: that method
   * reports the *emitter's* dead-letter list (e.g. `HttpSink`'s), which is a
   * different set of events.
   */
  getDeadLetter(): DeadLetterQueue {
    return this.deadLetter;
  }

  /**
   * The emitter's own dead-letter entries, when the emitter keeps one.
   * Empty for emitters that do not (e.g. `ConsoleSink`, a plain function).
   */
  getDeadLetters(): AnalyticsEvent[] {
    const emitter = this.emitter as Partial<{ getDeadLetters(): AnalyticsEvent[] }>;
    return typeof emitter.getDeadLetters === 'function' ? emitter.getDeadLetters() : [];
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
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