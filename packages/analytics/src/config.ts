/**
 * @fileoverview Analytics client configuration — interface definition and
 * a helper that merges caller-supplied options with sensible defaults.
 */

/**
 * Configuration contract for the analytics client.
 * All fields except `endpoint` are optional and will be filled with
 * defaults by {@link resolveConfig}.
 */
export interface AnalyticsConfig {
  /**
   * The HTTP endpoint to which batched events are flushed.
   * Must be an absolute URL (e.g. `'https://ingest.example.com/v1/events'`).
   */
  endpoint: string;

  /**
   * Optional API key sent as a bearer token or custom header when
   * authenticating with the ingest endpoint.
   */
  apiKey?: string;

  /**
   * When `true`, the client logs each tracked event and flush attempt
   * to `console.debug`. Defaults to `false`.
   */
  debug?: boolean;

  /**
   * Interval in milliseconds between automatic queue flushes.
   * Defaults to `5000` (5 seconds).
   */
  flushIntervalMs?: number;

  /**
   * Maximum number of events held in the in-memory queue before an
   * automatic flush is triggered regardless of the timer.
   * Defaults to `100`.
   */
  maxQueueSize?: number;

  /**
   * A value in the range `[0, 1]` controlling what fraction of events
   * are actually tracked. `1.0` means all events are tracked; `0.0`
   * means none are. Defaults to `1.0`.
   */
  sampleRate?: number;
}

/**
 * Merges caller-supplied partial options with the package's default values,
 * returning a fully-resolved {@link AnalyticsConfig}.
 *
 * @param options - Partial configuration supplied by the caller.  Only
 *   `endpoint` is required; everything else falls back to its default.
 * @returns A complete `AnalyticsConfig` with no undefined fields.
 *
 * @example
 * ```ts
 * const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
 * // config.flushIntervalMs === 5000
 * // config.maxQueueSize   === 100
 * // config.sampleRate     === 1.0
 * ```
 */
export function resolveConfig(options: Partial<AnalyticsConfig>): AnalyticsConfig {
  return {
    endpoint: options.endpoint ?? '',
    apiKey: options.apiKey,
    debug: options.debug ?? false,
    flushIntervalMs: options.flushIntervalMs ?? 5000,
    maxQueueSize: options.maxQueueSize ?? 100,
    sampleRate: options.sampleRate ?? 1.0,
  };
}
