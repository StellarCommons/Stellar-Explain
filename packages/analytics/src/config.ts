/**
 * Configuration options for the Analytics client.
 */
export interface AnalyticsConfig {
  /** The HTTP endpoint events are sent to. */
  endpoint?: string;
  /** Optional API key included with every request. */
  apiKey?: string;
  /** When true, debug logging is enabled. Default: false. */
  debug?: boolean;
  /** How often (ms) the event queue is flushed. Default: 5000. */
  flushIntervalMs?: number;
  /** Maximum number of events held in the queue before flushing. Default: 100. */
  maxQueueSize?: number;
  /** Fraction of events that are actually sent (0–1). Default: 1.0. */
  sampleRate?: number;
  /**
   * When true, installs a global `window.onerror` listener and reports
   * uncaught errors as `error` events (Analytics #66). Default: false —
   * opt-in, since a host app may already have its own error reporting.
   */
  captureGlobalErrors?: boolean;
}

/** A config with every field but `apiKey` guaranteed to be present. */
export type ResolvedAnalyticsConfig = Required<Omit<AnalyticsConfig, 'apiKey'>> &
  Pick<AnalyticsConfig, 'apiKey'>;

const DEFAULTS: Omit<ResolvedAnalyticsConfig, 'apiKey'> = {
  endpoint: '',
  debug: false,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
  captureGlobalErrors: false,
};

/**
 * Merges caller-supplied options with sensible defaults.
 *
 * `apiKey` is left `undefined` when not provided rather than defaulted to
 * an empty string, so callers can distinguish "no key configured" from
 * "explicitly empty key".
 *
 * @param options - Partial configuration supplied by the consumer.
 * @returns A fully-resolved config with every field but `apiKey` populated.
 */
export function resolveConfig(options: AnalyticsConfig = {}): ResolvedAnalyticsConfig {
  return { ...DEFAULTS, ...options };
}
