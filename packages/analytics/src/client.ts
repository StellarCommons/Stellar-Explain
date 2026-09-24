import type { AnalyticsConfig } from './config.js';
import type { Emitter } from './emitter/index.js';
import type {
  AnalyticsEvent,
  AnalyticsLifecycleEvent,
  AnalyticsLifecycleHandler,
  AnalyticsLifecyclePayload,
  AnalyticsMetrics,
} from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { CircuitBreaker } from './lib/circuitBreaker.js';
import { validateProperties } from './validate.js';
import { EventDeduplicator } from './dedup.js';
import { shouldSample } from './sampling.js';
import { eventByteLength, isWithinByteLimit } from './utils/eventSize.js';
import { limitPayload } from './utils/limitPayload.js';
import { applyPlugins, type AnalyticsPlugin } from './plugins.js';
import { HttpSink } from './sinks/HttpSink.js';
import { MultiSink } from './sinks/MultiSink.js';

interface ClientConfigWithSinks extends Partial<AnalyticsConfig> {
  sinks?: readonly Emitter[];
  emitters?: readonly Emitter[];
  plugins?: readonly AnalyticsPlugin[];
}

interface MutableMetrics {
  eventsTracked: number;
  eventsDropped: number;
  eventsSent: number;
  eventsFailed: number;
}

function isEmitterLike(value: unknown): value is Emitter {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { send?: unknown }).send === 'function'
  );
}

function maxEventBytes(config: AnalyticsConfig): number {
  return (
    config.maxEventBytes ??
    config.maxEventSize ??
    config.eventSizeLimit ??
    config.maxPayloadSize ??
    config.maxEventLength ??
    0
  );
}

/** Make a best effort to fit an event under a cap without producing invalid JSON. */
function truncateEventToLimit(event: AnalyticsEvent, limit: number): AnalyticsEvent | null {
  if (isWithinByteLimit(event, limit)) return event;

  for (const maxStringLength of [512, 256, 128, 64, 32, 16, 8, 4, 1]) {
    const candidate: AnalyticsEvent = {
      ...event,
      properties: limitPayload(event.properties, { maxStringLength }) as Record<string, unknown>,
      ...(event.context
        ? {
            context: limitPayload(event.context, { maxStringLength }) as Record<string, unknown>,
          }
        : {}),
    };
    if (isWithinByteLimit(candidate, limit)) return candidate;
  }

  return null;
}

/** Main analytics client and pipeline entry point. */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly logger: Logger;
  private readonly sinks: readonly Emitter[];
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly circuit: CircuitBreaker | undefined;
  private readonly deduplicator: EventDeduplicator;
  private readonly plugins: readonly AnalyticsPlugin[];
  private readonly listeners = new Map<string, Set<AnalyticsLifecycleHandler>>();
  private readonly deadLetters: AnalyticsEvent[] = [];
  private readonly metricsState: MutableMetrics = {
    eventsTracked: 0,
    eventsDropped: 0,
    eventsSent: 0,
    eventsFailed: 0,
  };
  private timer: ReturnType<typeof setInterval> | undefined;
  private flushPromise: Promise<void> | undefined;
  private fetchFallbackWarned = false;
  private notifiedCircuitOpenCount = 0;

  constructor(config?: Partial<AnalyticsConfig>, emitter?: Emitter | readonly Emitter[]);
  /** @deprecated Pass configuration first; this overload keeps old integrations working. */
  constructor(emitter: Emitter | readonly Emitter[], config?: Partial<AnalyticsConfig>);
  constructor(
    first: Partial<AnalyticsConfig> | Emitter | readonly Emitter[] = {},
    second?: Emitter | readonly Emitter[] | Partial<AnalyticsConfig>,
  ) {
    const firstIsSink = isEmitterLike(first) || Array.isArray(first);
    const rawConfig = (
      firstIsSink
        ? isEmitterLike(second) || Array.isArray(second)
          ? {}
          : second ?? {}
        : (first as Partial<AnalyticsConfig>)
    ) as ClientConfigWithSinks;
    this.config = resolveConfig(rawConfig);
    this.logger = new Logger(this.config.debug ?? false);
    this.plugins = rawConfig.plugins ?? [];

    const configuredSinks = firstIsSink
      ? (first as Emitter | readonly Emitter[])
      : (second as Emitter | readonly Emitter[] | undefined) ??
        rawConfig.sinks ??
        rawConfig.emitters;
    this.sinks = this.resolveSinks(configuredSinks);
    this.emitter = this.sinks.length === 1 ? this.sinks[0] : new MultiSink(this.sinks);
    const hasExternalCircuit = this.sinks.some(
      (sink) => typeof (sink as { getCircuitState?: unknown }).getCircuitState === 'function',
    );
    const hasExplicitCircuitConfig =
      rawConfig.circuitFailureThreshold !== undefined || rawConfig.circuitCooldownMs !== undefined;
    this.circuit = hasExternalCircuit
      ? undefined
      : hasExplicitCircuitConfig
      ? new CircuitBreaker({
          failureThreshold: this.config.circuitFailureThreshold,
          cooldownMs: this.config.circuitCooldownMs,
        })
      : undefined;
    this.deduplicator = new EventDeduplicator(this.config.dedupWindowMs ?? 0);
    this.queue = new EventQueue(this.config.maxQueueSize ?? 0, this.logger, (_event, reason) => {
      if (reason === 'max-size') this.recordDrop('queue.max_size');
    });

    if ((this.config.flushIntervalMs ?? 0) > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
      // Do not keep a Node process alive solely for analytics. Browsers simply
      // ignore the optional unref method.
      const unref = (this.timer as { unref?: () => void }).unref;
      unref?.call(this.timer);
    }
  }

  /** Queue one event after validation, middleware, sampling, and size checks. */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string');
    }
    validateProperties(properties);

    let event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties: { ...properties },
      context: this.eventContext(),
    };

    try {
      const beforeSend = this.config.beforeSend;
      if (beforeSend) {
        const transformed = beforeSend(event);
        if (transformed == null) {
          this.recordDrop('before_send');
          return;
        }
        event = transformed;
      }
      const transformed = applyPlugins(event, this.plugins);
      if (transformed == null) {
        this.recordDrop('plugin.cancelled');
        return;
      }
      event = transformed;
    } catch (error) {
      this.logger.log('error', 'track.error', { error: this.errorMessage(error) });
      this.recordDrop('middleware.error');
      return;
    }

    const duplicate = this.deduplicator.isDuplicate(event);
    this.logger.log('debug', 'dedup', { eventName: event.name, duplicate });
    if (duplicate) {
      this.emit('dedup', { eventName: event.name });
      this.recordDrop('dedup');
      return;
    }

    const sampled = shouldSample(this.config.sampleRate ?? 1);
    this.logger.log('debug', 'sample', { eventName: event.name, accepted: sampled });
    if (!sampled) {
      this.emit('sample', { eventName: event.name, sampled: false });
      this.recordDrop('sample');
      return;
    }

    const limit = maxEventBytes(this.config);
    if (limit > 0 && !isWithinByteLimit(event, limit)) {
      if (this.config.oversizedEventPolicy === 'truncate') {
        const truncated = truncateEventToLimit(event, limit);
        if (truncated) {
          event = truncated;
        } else {
          this.logger.log('warn', 'track.drop', {
            reason: 'max-event-bytes',
            bytes: eventByteLength(event),
            limit,
          });
          this.recordDrop('max-event-bytes');
          return;
        }
      } else {
        this.logger.log('warn', 'track.drop', {
          reason: 'max-event-bytes',
          bytes: eventByteLength(event),
          limit,
        });
        this.recordDrop('max-event-bytes');
        return;
      }
    }

    this.metricsState.eventsTracked += 1;
    this.logger.log('debug', 'enqueue', {
      eventName: event.name,
      queueSize: this.queue.size + 1,
    });
    this.queue.enqueue(event);
    this.emit('enqueue', { eventName: event.name, queueSize: this.queue.size });
  }

  /** Drain queued events and deliver them to every configured sink. */
  async flush(): Promise<void> {
    if (this.flushPromise) return this.flushPromise;

    const events = this.queue.drain();
    this.emit('flush', { phase: 'start', count: events.length });
    this.logger.log('debug', 'flush.start', { count: events.length });

    this.flushPromise = this.deliver(events)
      .then(() => {
        this.logger.log('debug', 'flush.complete', { count: events.length });
      })
      .finally(() => {
        this.flushPromise = undefined;
      });

    return this.flushPromise;
  }

  /** Stop the timer and perform a best-effort final flush. */
  destroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    void this.flush();
  }

  /** Toggle structured debug logging at runtime. */
  debug(enabled = true): this {
    this.logger.setEnabled(enabled);
    return this;
  }

  /** Subscribe to lifecycle events; the returned function unsubscribes. */
  on(eventName: AnalyticsLifecycleEvent | string, handler: AnalyticsLifecycleHandler): () => void {
    if (typeof handler !== 'function') throw new TypeError('Lifecycle handler must be a function');
    const handlers = this.listeners.get(eventName) ?? new Set<AnalyticsLifecycleHandler>();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);
    return () => this.off(eventName, handler);
  }

  off(eventName: AnalyticsLifecycleEvent | string, handler: AnalyticsLifecycleHandler): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this.listeners.delete(eventName);
  }

  /** Return a fresh metrics snapshot. */
  getMetrics(): Readonly<AnalyticsMetrics> & {
    readonly tracked: number;
    readonly dropped: number;
    readonly sent: number;
    readonly failed: number;
    readonly queueSize: number;
    readonly deadLetterCount: number;
  } {
    const snapshot = {
      eventsTracked: this.metricsState.eventsTracked,
      eventsDropped: this.metricsState.eventsDropped,
      eventsSent: this.metricsState.eventsSent,
      eventsFailed: this.metricsState.eventsFailed,
      circuitState: this.currentCircuitState(),
      circuitOpenCount: this.currentCircuitOpenCount(),
    } as AnalyticsMetrics & {
      tracked: number;
      dropped: number;
      sent: number;
      failed: number;
      queueSize: number;
      deadLetterCount: number;
    };

    // Keep the documented event* fields enumerable while offering concise
    // aliases for consumers that used the terminology from the issue text.
    Object.defineProperties(snapshot, {
      tracked: { value: snapshot.eventsTracked, enumerable: false },
      dropped: { value: snapshot.eventsDropped, enumerable: false },
      sent: { value: snapshot.eventsSent, enumerable: false },
      failed: { value: snapshot.eventsFailed, enumerable: false },
      queueSize: { value: this.queue.size, enumerable: false },
      deadLetterCount: { value: this.deadLetters.length, enumerable: false },
    });
    return snapshot;
  }

  getCircuitState(): 'closed' | 'open' | 'half-open' | undefined {
    return this.currentCircuitState();
  }

  getCircuitOpenCount(): number {
    return this.currentCircuitOpenCount();
  }

  getDeadLetters(): AnalyticsEvent[] {
    const sinkLetters = this.sinks.flatMap((sink) => {
      const deadLetterSink = sink as { getDeadLetters?: () => AnalyticsEvent[] };
      return deadLetterSink.getDeadLetters?.() ?? [];
    });
    return [...new Set([...this.deadLetters, ...sinkLetters])];
  }

  getEmitter(): Emitter {
    return this.emitter;
  }

  getQueue(): EventQueue {
    return this.queue;
  }

  getSinks(): readonly Emitter[] {
    return [...this.sinks];
  }

  getLogger(): Logger {
    return this.logger;
  }

  private currentCircuitState(): 'closed' | 'open' | 'half-open' | undefined {
    const circuitAware = this.emitter as {
      getCircuitState?: () => 'closed' | 'open' | 'half-open';
    };
    return circuitAware.getCircuitState?.() ?? this.circuit?.getState();
  }

  private currentCircuitOpenCount(): number {
    const circuitAware = this.emitter as { getCircuitOpenCount?: () => number };
    return circuitAware.getCircuitOpenCount?.() ?? this.circuit?.getOpenCount() ?? 0;
  }

  private resolveSinks(configured: Emitter | readonly Emitter[] | undefined): readonly Emitter[] {
    if (Array.isArray(configured)) {
      return configured.length > 0 ? [...configured] : [new NoopEmitter()];
    }
    if (configured !== undefined) return [configured as Emitter];

    if (this.config.endpoint) {
      const fetchImpl = this.config.fetchImpl;
      const hasFetch =
        typeof (fetchImpl ?? (globalThis as unknown as { fetch?: unknown }).fetch) === 'function';
      if (hasFetch) {
        return [
          new HttpSink({
            url: this.config.endpoint,
            headers: this.config.headers,
            apiKey: this.config.apiKey,
            batchSize: this.config.batchSize,
            fetchImpl,
            circuitBreaker: {
              failureThreshold: this.config.circuitFailureThreshold,
              cooldownMs: this.config.circuitCooldownMs,
            },
            logger: this.logger,
          }),
        ];
      }
      if (!this.fetchFallbackWarned) {
        this.fetchFallbackWarned = true;
        this.logger.warnAlways('fetch.unavailable', { fallback: 'NoopEmitter' });
      }
    }

    return [new NoopEmitter()];
  }

  private eventContext(): Record<string, unknown> {
    const context = { ...(this.config.context ?? {}) };
    if (this.config.buildVersion !== undefined) context.buildVersion = this.config.buildVersion;
    if (this.config.environment !== undefined) context.environment = this.config.environment;
    if (this.config.deployEnvironment !== undefined) {
      context.deployEnvironment = this.config.deployEnvironment;
    }
    return context;
  }

  private async deliver(events: readonly AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const delivered = new Set<AnalyticsEvent>();
    const failed = new Set<AnalyticsEvent>();
    const failureReasons = new Map<AnalyticsEvent, unknown>();

    for (const sink of this.sinks) {
      if (typeof sink.sendBatch === 'function') {
        await this.deliverBatch(sink, events, delivered, failed, failureReasons);
      } else {
        for (const event of events) {
          await this.deliverOne(sink, event, delivered, failed, failureReasons);
        }
      }
    }

    for (const event of events) {
      if (delivered.has(event)) this.metricsState.eventsSent += 1;
      if (failed.has(event)) {
        this.metricsState.eventsFailed += 1;
        this.addDeadLetter(event);
        this.emit('error', {
          eventName: event.name,
          phase: 'send',
          error: failureReasons.get(event),
        });
      }
      const sent = delivered.has(event);
      this.logger.log('debug', 'send', {
        eventName: event.name,
        sent,
        failed: failed.has(event),
      });
      this.emit('send', { eventName: event.name, sent });
    }
  }

  private async deliverBatch(
    sink: Emitter,
    events: readonly AnalyticsEvent[],
    delivered: Set<AnalyticsEvent>,
    failed: Set<AnalyticsEvent>,
    failureReasons: Map<AnalyticsEvent, unknown>,
  ): Promise<void> {
    if (this.circuit && !this.circuit.canPass()) {
      for (const event of events) failed.add(event);
      this.emitCircuitBlocked(events.length);
      return;
    }

    try {
      await sink.sendBatch!(events);
      this.circuit?.recordSuccess();
      for (const event of events) delivered.add(event);
    } catch (error) {
      this.circuit?.recordFailure();
      for (const event of events) {
        failed.add(event);
        failureReasons.set(event, error);
      }
      this.logger.log('error', 'emitter.error', {
        sink: sink.constructor.name,
        count: events.length,
        error: this.errorMessage(error),
      });
      this.emitCircuitIfOpened();
    }
  }

  private async deliverOne(
    sink: Emitter,
    event: AnalyticsEvent,
    delivered: Set<AnalyticsEvent>,
    failed: Set<AnalyticsEvent>,
    failureReasons: Map<AnalyticsEvent, unknown>,
  ): Promise<void> {
    if (this.circuit && !this.circuit.canPass()) {
      failed.add(event);
      this.emitCircuitBlocked(1);
      return;
    }

    try {
      await sink.send(event);
      this.circuit?.recordSuccess();
      delivered.add(event);
    } catch (error) {
      this.circuit?.recordFailure();
      failed.add(event);
      failureReasons.set(event, error);
      this.logger.log('error', 'emitter.error', {
        sink: sink.constructor.name,
        eventName: event.name,
        error: this.errorMessage(error),
      });
      this.emitCircuitIfOpened();
    }
  }

  private emitCircuitIfOpened(): void {
    if (this.currentCircuitState() !== 'open') return;
    const openCount = this.currentCircuitOpenCount();
    if (openCount > this.notifiedCircuitOpenCount) {
      this.notifiedCircuitOpenCount = openCount;
      this.emit('circuit-open', { openCount, blocked: false });
      this.logger.log('warn', 'circuit.open', { openCount });
    }
  }

  private emitCircuitBlocked(count: number): void {
    this.logger.log('debug', 'circuit.blocked', {
      count,
      openCount: this.currentCircuitOpenCount(),
    });
  }

  private recordDrop(reason: string): void {
    this.metricsState.eventsDropped += 1;
    this.logger.log('debug', 'track.drop', { reason });
  }

  private addDeadLetter(event: AnalyticsEvent): void {
    this.deadLetters.push(event);
    const cap = this.config.deadLetterCap ?? 100;
    const overflow = this.deadLetters.length - cap;
    if (overflow > 0) this.deadLetters.splice(0, overflow);
  }

  private emit(
    eventName: AnalyticsLifecycleEvent | string,
    payload: AnalyticsLifecyclePayload,
  ): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    const enrichedPayload = { type: eventName, ...payload };
    for (const handler of handlers) {
      try {
        const result = handler(enrichedPayload);
        if (result && typeof result.then === 'function') {
          void result.catch((error: unknown) => {
            this.logger.log('error', 'listener.error', {
              eventName,
              error: this.errorMessage(error),
            });
          });
        }
      } catch (error) {
        this.logger.log('error', 'listener.error', {
          eventName,
          error: this.errorMessage(error),
        });
      }
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
