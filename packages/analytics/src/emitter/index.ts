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
/** Contract that every event sink must satisfy. */
export interface Emitter {
  send(event: AnalyticsEvent): void;
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
}
}
}

/**
 * #96 — alias of {@link Emitter}. Delivery-oriented naming for the same
 * interface (e.g. `ConsoleSink`, `HttpSink`, `MultiSink` all implement it).
 */
export type Sink = Emitter;
}
