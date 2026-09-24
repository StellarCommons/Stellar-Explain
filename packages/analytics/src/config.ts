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
  /** #100 — the active environment name (e.g. "production", "test"). */
  environment?: string;
  /** #100 — per-environment endpoint lookup; used when `endpoint` is empty. */
  endpointConfig?: Record<string, string>;
}

const DEFAULTS: AnalyticsConfig = {
  endpoint: '',
  debug: false,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
};

/**
 * Merges caller-supplied options with sensible defaults.
 *
 * When every required field is already present (i.e. the input was produced
 * by a previous `resolveConfig` call) the input is returned as-is so that
 * downstream identity checks hold.
 *
 * #100 — when `endpoint` is empty and `environment` + `endpointConfig`
 * are provided, the endpoint for the active environment is applied.
 * An explicit `endpoint` always wins over the environment map.
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

  const resolved = isComplete ? (options as AnalyticsConfig) : { ...DEFAULTS, ...options };

  // #100 — derive the endpoint from the environment map when no explicit
  // endpoint was given.
  if (
    !resolved.endpoint &&
    resolved.environment &&
    resolved.endpointConfig &&
    resolved.endpointConfig[resolved.environment]
  ) {
    resolved.endpoint = resolved.endpointConfig[resolved.environment];
  }

  return resolved;
}