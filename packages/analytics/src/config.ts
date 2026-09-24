/**
 * Configuration options for the Analytics client.
 */
export interface AnalyticsConfig {
  /** The HTTP endpoint events are sent to. */
  endpoint: string;
  /** Optional API key included with every request. */
  apiKey?: string;
  /** When true, debug logging is enabled. Default: false. */
  debug: boolean;
  /** How often (ms) the event queue is flushed. Default: 5000. */
  flushIntervalMs: number;
  /** Maximum number of events held in the queue before flushing. Default: 100. */
  maxQueueSize: number;
  /** Fraction of events that are actually sent (0–1). Default: 1.0. */
  sampleRate: number;
  /** #89 — when true (default) track() scrubs PII from event properties. */
  scrubPii?: boolean;
}

const DEFAULTS: AnalyticsConfig = {
  endpoint: '',
  debug: false,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
  scrubPii: true,
};

/**
 * Merges caller-supplied options with sensible defaults.
 *
 * When every required field is already present (i.e. the input was produced
 * by a previous `resolveConfig` call) the input is returned as-is so that
 * downstream identity checks hold.
 *
 * @param options - Partial configuration supplied by the consumer.
 * @returns A fully-resolved `AnalyticsConfig` with every field populated.
 */
export function resolveConfig(options: Partial<AnalyticsConfig> = {}): AnalyticsConfig {
  const isComplete =
    'endpoint' in options &&
    'debug' in options &&
    'flushIntervalMs' in options &&
    'maxQueueSize' in options &&
    'sampleRate' in options;

  if (isComplete) {
    return options as AnalyticsConfig;
  }

  return { ...DEFAULTS, ...options };
}