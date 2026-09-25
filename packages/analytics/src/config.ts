/**
 * Configuration options for the Analytics client.
 */
export interface AnalyticsConfig {
  /** The HTTP endpoint events are sent to. */
  endpoint?: string;
  /** Optional API key included with every request. */
import type { AnalyticsEvent } from './types.js';

export interface AnalyticsConfig {
  /** The endpoint to send events to. */
  endpoint: string;
  /** Enable debug logging. Defaults to false. */
  debug?: boolean;
  /** Max queue size before oldest events are dropped. Defaults to 100. */
  maxQueueSize?: number;
  /** Auto-flush interval in ms. 0 disables. Defaults to 5000. */
  flushInterval?: number;
  /** Sampling rate 0–1. 1 = send all events. Defaults to 1. */
  sampleRate?: number;
  /** Max bytes for any single property value string. Defaults to 1024. */
  maxPropertyBytes?: number;
  /** Called before an event is enqueued. Return null to cancel. */
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null;
}

export interface ResolvedConfig extends Required<AnalyticsConfig> {}

export function resolveConfig(config: AnalyticsConfig): ResolvedConfig {
  return {
    endpoint: config.endpoint,
    debug: config.debug ?? false,
    maxQueueSize: config.maxQueueSize ?? 100,
    flushInterval: config.flushInterval ?? 5000,
    sampleRate: config.sampleRate ?? 1,
    maxPropertyBytes: config.maxPropertyBytes ?? 1024,
    beforeSend: config.beforeSend ?? ((e) => e),
  endpoint: string;
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
  debug?: boolean;
  flushIntervalMs?: number;
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
 * When every required field is already present (i.e. the input was produced
 * by a previous `resolveConfig` call) the input is returned as-is so that
 * downstream identity checks hold.
 *
 * #100 — when `endpoint` is empty and `environment` + `endpointConfig`
 * are provided, the endpoint for the active environment is applied.
 * An explicit `endpoint` always wins over the environment map.
 * `apiKey` is left `undefined` when not provided rather than defaulted to
 * an empty string, so callers can distinguish "no key configured" from
 * "explicitly empty key".
 *
 * @param options - Partial configuration supplied by the consumer.
 * @returns A fully-resolved config with every field but `apiKey` populated.
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
export function resolveConfig(options: AnalyticsConfig = {}): ResolvedAnalyticsConfig {
  return { ...DEFAULTS, ...options };
  sampleRate?: number;          // 0-1, default 1.0
  maxPropertyBytes?: number;    // max bytes per property value, default 1024
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null; // null cancels
}

export function resolveConfig(config: AnalyticsConfig): Required<Omit<AnalyticsConfig, 'apiKey' | 'beforeSend'>> & Pick<AnalyticsConfig, 'apiKey' | 'beforeSend'> {
  return {
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    debug: config.debug ?? false,
    flushIntervalMs: config.flushIntervalMs ?? 5000,
    maxQueueSize: config.maxQueueSize ?? 100,
    sampleRate: config.sampleRate ?? 1.0,
    maxPropertyBytes: config.maxPropertyBytes ?? 1024,
    beforeSend: config.beforeSend,
  };
}
