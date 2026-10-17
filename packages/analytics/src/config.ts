import type { AnalyticsEvent } from './types.js';

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
  /** Max bytes for any single property value string. Default: 1024. */
  maxPropertyBytes: number;
  /** Called before an event is enqueued. Return null to cancel. */
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null;
  /** #100 — the active environment name (e.g. "production", "test"). */
  environment?: string;
  /** #100 — per-environment endpoint lookup; used when `endpoint` is empty. */
  endpointConfig?: Record<string, string>;
  /** #93 — client-side send rate cap (events per second). Default: 100. */
  maxEventsPerSecond?: number;
  /** #89 — when true (default) track() scrubs PII from event properties. */
  scrubPii?: boolean;
  /**
   * When true, installs a global `window.onerror` listener and reports
   * uncaught errors as `error` events (Analytics #66). Default: false —
   * opt-in, since a host app may already have its own error reporting.
   */
  captureGlobalErrors?: boolean;
}

/**
 * The fields {@link resolveConfig} guarantees to populate.
 *
 * Named explicitly rather than written as `Required<Omit<AnalyticsConfig,
 * 'apiKey'>>`: `Required<>` would also make `environment` and `endpointConfig`
 * mandatory, which they are not — they stay absent unless a caller passes them,
 * and forcing them into DEFAULTS would mean inventing empty values that then
 * have to be distinguished from "the caller set this to empty".
 */
export type ConfigDefaults = Required<
  Pick<
    AnalyticsConfig,
    | 'endpoint'
    | 'debug'
    | 'flushIntervalMs'
    | 'maxQueueSize'
    | 'sampleRate'
    | 'maxPropertyBytes'
    | 'beforeSend'
    | 'maxEventsPerSecond'
    | 'scrubPii'
    | 'captureGlobalErrors'
  >
>;

/**
 * A config with every defaulted field guaranteed to be present.
 *
 * `apiKey` stays optional on the resolved type because "no key configured" and
 * "explicitly empty key" are different states, and callers need to tell them
 * apart (an empty key should fail authentication loudly, a missing one should
 * be treated as anonymous). Collapsing it to `string` here would make that
 * distinction unrepresentable.
 */
export type ResolvedConfig = ConfigDefaults &
  Omit<AnalyticsConfig, 'apiKey'> &
  Pick<AnalyticsConfig, 'apiKey'>;

/** @deprecated Use {@link ResolvedConfig}. Retained as the original name. */
export type ResolvedAnalyticsConfig = ResolvedConfig;

/**
 * Defaults applied by {@link resolveConfig}.
 *
 * `apiKey` is deliberately absent from this table so that it stays `undefined`
 * rather than defaulting to `''`. See {@link ResolvedConfig} for why that
 * distinction matters.
 */
const DEFAULTS: ConfigDefaults = {
  endpoint: '',
  debug: false,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  sampleRate: 1.0,
  maxPropertyBytes: 1024,
  // Identity transform: the hook is called unconditionally by the client, so
  // defaulting it to a pass-through keeps that call site free of `?.` and of a
  // "is beforeSend configured?" branch.
  beforeSend: (event) => event,
  maxEventsPerSecond: 100,
  scrubPii: true,
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