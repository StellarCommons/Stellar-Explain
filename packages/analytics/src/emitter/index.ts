import type { AnalyticsEvent } from '../types.js';
import type { CircuitState } from '../lib/circuitBreaker.js';

/** Contract implemented by analytics transports and sinks. */
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
  /** Optional batch capability used by the client when available. */
  sendBatch?(events: readonly AnalyticsEvent[]): void | Promise<void>;
  /** Optional circuit introspection exposed by resilient transports. */
  getCircuitState?(): CircuitState;
  /** Optional cumulative open-episode count. */
  getCircuitOpenCount?(): number;
}
