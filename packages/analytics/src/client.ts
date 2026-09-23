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
  }
}
