import type { Emitter } from './emitter/index.js';
import type { AnalyticsConfig } from './config.js';
import type { AnalyticsEvent } from './types.js';
import { resolveConfig } from './config.js';
import { NoopEmitter } from './emitter/NoopEmitter.js';
import { EventQueue } from './queue.js';
import { Logger } from './lib/logger.js';
import { validateProperties } from './validate.js';
import { MultiSink } from './sinks/MultiSink.js';
import type { Plugin } from './plugins.js';
import { PluginRegistry } from './plugins.js';
import { Middleware } from './middleware.js';

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
 */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly emitter: Emitter;
  private readonly queue: EventQueue;
  private readonly logger: Logger;
  private readonly plugins = new PluginRegistry();
  private readonly middleware = new Middleware();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(config: Partial<AnalyticsConfig> = {}, emitter?: Emitter | Emitter[]) {
    this.config = resolveConfig(config);
    this.logger = new Logger(this.config.debug);
    this.emitter = this.buildEmitter(emitter);
    this.queue = new EventQueue(this.config.maxQueueSize, this.logger);

    // #1072 — start auto-flush timer if configured
    if (this.config.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  /**
   * #97 — normalize the emitter argument: no emitter → NoopEmitter,
   * a single emitter → itself, an array → MultiSink fan-out.
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
   * #1071, #99 — Drain the queue, run each event through the middleware
   * pipeline, then forward it to the emitter(s).
   */
  async flush(): Promise<void> {
    const events = this.queue.drain();
    await Promise.all(
      events.map(async (event) => {
        const prepared = await this.middleware.process(event);
        await this.emitter.send(prepared);
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
}