import type { AnalyticsEvent } from './types.js';
import type { FetchLike } from './sinks/HttpSink.js';
import type { CircuitBreakerOptions } from './lib/circuitBreaker.js';

/**
 * Configuration options for the Analytics client.
 */
export interface AnalyticsConfig {
  /** The HTTP endpoint events are sent to. */
  endpoint: string;
  /** Optional API key included with every request. */
  apiKey?: string;
  /** Optional fetch implementation used by the default HTTP transport. */
  fetchImpl?: FetchLike;
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
  /** #94 — tuning for the client-owned circuit breaker. */
  circuitBreaker?: CircuitBreakerOptions;
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

function validateNumericOption(
  name: string,
  value: unknown,
  min: number,
  max: number = Number.POSITIVE_INFINITY,
): void {
  if (value === undefined) return;
  const expected =
    max === Number.POSITIVE_INFINITY ? `>= ${min}` : `between ${min} and ${max}`;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`Invalid ${name}: expected a finite number ${expected}.`);
  }
}

/**
 * Merges caller-supplied options with sensible defaults.
 *
 * Explicit `undefined` values are treated as absent, and the caller's object is
 * always copied so endpoint derivation and later mutations cannot affect it.
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
  const definedOptions = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as Partial<AnalyticsConfig>;

  const isComplete =
    'endpoint' in definedOptions &&
    'debug' in definedOptions &&
    'flushIntervalMs' in definedOptions &&
    'maxQueueSize' in definedOptions &&
    'sampleRate' in definedOptions;

  const resolved: AnalyticsConfig = isComplete
    ? ({ ...definedOptions } as AnalyticsConfig)
    : { ...DEFAULTS, ...definedOptions };

  validateNumericOption('sampleRate', resolved.sampleRate, 0, 1);
  validateNumericOption('flushIntervalMs', resolved.flushIntervalMs, 0);
  validateNumericOption('maxQueueSize', resolved.maxQueueSize, 1);
  validateNumericOption('maxPropertyBytes', resolved.maxPropertyBytes, 1);
  validateNumericOption('maxEventsPerSecond', resolved.maxEventsPerSecond, 1);

  const environmentEndpoint =
    !resolved.endpoint &&
    resolved.environment &&
    resolved.endpointConfig?.[resolved.environment];

  return environmentEndpoint ? { ...resolved, endpoint: environmentEndpoint } : resolved;
}