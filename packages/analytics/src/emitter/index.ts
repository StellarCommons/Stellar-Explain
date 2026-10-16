import type { AnalyticsEvent } from '../types.js';

/**
 * Contract for all event emitters used by the analytics client.
 *
 * An *Emitter* accepts analytics events and delivers them somewhere
 * (network, console, storage, another process, ...). Implementations may be
 * synchronous (return `void`) or asynchronous (return `Promise<void>`).
 *
 * #96 — "sink" is the delivery-oriented name for the very same contract;
 * `Sink` is provided as an alias so both vocabularies resolve cleanly.
 */
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
  /**
   * Optional batch variant of {@link Emitter.send}.
   *
   * Declared optional because most emitters are genuinely per-event
   * (`NoopEmitter`, `ConsoleSink`). `MultiSink` uses it to hand a batch
   * straight to any child sink that can take one, falling back to per-event
   * sends for the rest — which is why the capability is probed rather than
   * assumed.
   */
  sendBatch?(events: readonly AnalyticsEvent[]): void | Promise<void>;
}

/**
 * #96 — alias of {@link Emitter}. Delivery-oriented naming for the same
 * interface (e.g. `ConsoleSink`, `HttpSink`, `MultiSink` all implement it).
 */
export type Sink = Emitter;