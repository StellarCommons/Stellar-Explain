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
  private readonly emitter: Emitter;
  private readonly logger: Logger;
  private readonly dedup: EventDeduplicator;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

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
