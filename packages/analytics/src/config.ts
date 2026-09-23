/**
 * Configuration options for the Analytics client.
 */
export interface AnalyticsConfig {
  /** The HTTP endpoint events are sent to. */
  endpoint: string;
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
}

const DEFAULTS: Required<AnalyticsConfig> = {
  endpoint: '',
  apiKey: '',
  debug: false,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
};

/**
 * Merges caller-supplied options with sensible defaults.
 *
 * @param options - Partial configuration supplied by the consumer.
 * @returns A fully-resolved `AnalyticsConfig` with every field populated.
 */
export function resolveConfig(options: Partial<AnalyticsConfig>): AnalyticsConfig {
  return { ...DEFAULTS, ...options };
}
