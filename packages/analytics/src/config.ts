/** Configuration for AnalyticsClient. */
export interface AnalyticsConfig {
  /** Enable debug logging. */
  debug?: boolean;
  /**
   * Milliseconds between automatic flushes.
   * Set to 0 (or omit) to disable the auto-flush timer.
   */
  flushIntervalMs?: number;
  /**
   * Maximum number of events held in the queue.
   * When exceeded, the oldest event is dropped and a warning is logged.
   * Set to 0 for unlimited.
   */
  maxQueueSize?: number;
}

export function resolveConfig(partial: AnalyticsConfig = {}): Required<AnalyticsConfig> {
  return {
    debug: partial.debug ?? false,
    flushIntervalMs: partial.flushIntervalMs ?? 0,
    maxQueueSize: partial.maxQueueSize ?? 100,
  };
export interface AnalyticsConfig {
  endpoint: string;
  flushIntervalMs: number;
  maxQueueSize: number;
  sampleRate: number;
  debug: boolean;
}

const DEFAULTS: AnalyticsConfig = {
  endpoint: '',
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
  debug: false,
};

export function resolveConfig(partial?: Partial<AnalyticsConfig>): AnalyticsConfig {
  return { ...DEFAULTS, ...partial };
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
