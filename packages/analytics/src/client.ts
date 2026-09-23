import type { Emitter } from './emitter/index.js';
import type { AnalyticsEvent } from './types.js';
import type { AnalyticsConfig } from './config.js';
import { resolveConfig } from './config.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import { HttpSink } from './sinks/HttpSink.js';

export class AnalyticsClient {
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly logger: Logger;
  private readonly config: Required<AnalyticsConfig>;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(emitter: Emitter, config: AnalyticsConfig = {}) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);
    this.emitter = emitter;

    if (this.config.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  track(name: string, properties?: Record<string, unknown>): void {
    if (properties) {
      validateProperties(properties);
    }
    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };
    this.queue.enqueue(event);
    this.logger.debug('tracked', name, properties);
  }

  async flush(): Promise<void> {
    const events = this.queue.drain();
    for (const event of events) {
      await this.emitter.send(event);
    }
    this.logger.debug(`flushed ${events.length} event(s)`);
  }

  async destroy(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  getQueue(): EventQueue {
    return this.queue;
  }

  getEmitter(): Emitter {
    return this.emitter;
  }

  getDeadLetters(): AnalyticsEvent[] {
    if (this.emitter instanceof HttpSink) {
      return this.emitter.getDeadLetters();
    }
    return [];
  }
}
