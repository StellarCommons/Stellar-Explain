export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  properties: Record<string, unknown>;
  /** Optional host/environment context attached by the client. */
  context?: Record<string, unknown>;
}

/** A lifecycle notification emitted by {@link AnalyticsClient}. */
export type AnalyticsLifecycleEvent =
  | 'enqueue'
  | 'dedup'
  | 'sample'
  | 'send'
  | 'flush'
  | 'error'
  | 'circuit-open'
  | 'circuit-close'
  | 'circuit-half-open';

/** Payload delivered to lifecycle listeners. */
export type AnalyticsLifecyclePayload = Record<string, unknown>;

/** Listener registered with `AnalyticsClient.on()`. */
export type AnalyticsLifecycleHandler = (
  payload: AnalyticsLifecyclePayload,
) => void | Promise<void>;

/** Counters exposed by `AnalyticsClient.getMetrics()`. */
export interface AnalyticsMetrics {
  /** Valid events accepted into the queue. */
  eventsTracked: number;
  /** Events discarded before successful delivery. */
  eventsDropped: number;
  /** Events successfully handed to at least one sink. */
  eventsSent: number;
  /** Events whose delivery failed. */
  eventsFailed: number;
  /** Current circuit state, or undefined when the configured sink has none. */
  circuitState?: 'closed' | 'open' | 'half-open';
  /** Number of times the circuit has opened. */
  circuitOpenCount: number;
}
