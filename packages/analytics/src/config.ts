import type { AnalyticsEvent } from './types.js';
import type { Emitter } from './emitter/index.js';
import type { AnalyticsPlugin } from './plugins.js';

/** Configuration accepted by the analytics client. */
export interface AnalyticsConfig {
  /** Endpoint used by an HTTP sink, when one is configured. */
  endpoint?: string;
  /** Optional API key exposed to sinks that support authentication. */
  apiKey?: string;
  /** Enable structured/debug logging at construction time. */
  debug?: boolean;
  /** Milliseconds between automatic flushes. `0` disables the timer. */
  flushIntervalMs?: number;
  /** Maximum number of events retained in memory; `0` means unlimited. */
  maxQueueSize?: number;
  /** Fraction of events retained by the optional sampling stage, from 0 to 1. */
  sampleRate?: number;
  /** Maximum serialized UTF-8 size of one event in bytes; `0` disables the check. */
  maxEventBytes?: number;
  /** Alias for `maxEventBytes`. */
  maxEventSize?: number;
  /** Alias for `maxEventBytes`, retained for configuration compatibility. */
  eventSizeLimit?: number;
  /** Additional aliases accepted by older configuration examples. */
  maxPayloadSize?: number;
  maxEventLength?: number;
  /** What to do with an event over the size limit. */
  oversizedEventPolicy?: 'drop' | 'truncate';
  /** Maximum number of events sent in one HTTP request. */
  batchSize?: number;
  /** Headers merged into every HTTP request. */
  headers?: Record<string, string>;
  /** Build/version identifier attached to every event context. */
  buildVersion?: string;
  /** Deployment environment attached to every event context. */
  environment?: string;
  /** Alias for `environment`. */
  deployEnvironment?: string;
  /** Additional context merged into every event context. */
  context?: Record<string, unknown>;
  /** Maximum number of failed events retained in memory. */
  deadLetterCap?: number;
  /** Consecutive sink failures before the circuit opens. */
  circuitFailureThreshold?: number;
  /** Time the circuit remains open before a trial delivery. */
  circuitCooldownMs?: number;
  /** Optional fetch implementation for an internally-created HttpSink. */
  fetchImpl?: typeof fetch;
  /** Optional hook to transform or cancel an event before queueing. */
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null | undefined;
  /** Deduplication window in milliseconds; zero disables deduplication. */
  dedupWindowMs?: number;
  /** Optional sinks for client-side fan-out. */
  sinks?: readonly Emitter[];
  /** Alias for `sinks`. */
  emitters?: readonly Emitter[];
  /** Optional ordered event plugins. */
  plugins?: readonly AnalyticsPlugin[];
}

const DEFAULT_FLUSH_INTERVAL_MS = 5_000;
const DEFAULT_MAX_QUEUE_SIZE = 100;
const DEFAULT_SAMPLE_RATE = 1;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_DEAD_LETTER_CAP = 100;
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 5;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 60_000;

function finiteNonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Merge user options with safe defaults.
 *
 * A fully resolved object is returned unchanged. This preserves the identity
 * of a config object for consumers that inspect or extend it after resolving.
 */
export function resolveConfig(options: Partial<AnalyticsConfig> = {}): AnalyticsConfig {
  const hasRequiredDefaults =
    typeof options.endpoint === 'string' &&
    typeof options.flushIntervalMs === 'number' &&
    typeof options.maxQueueSize === 'number' &&
    typeof options.sampleRate === 'number' &&
    typeof options.debug === 'boolean';

  if (hasRequiredDefaults) {
    return options as AnalyticsConfig;
  }

  const environment = options.environment ?? options.deployEnvironment;

  const maxEventBytes =
    options.maxEventBytes ??
    options.maxEventSize ??
    options.eventSizeLimit ??
    options.maxPayloadSize ??
    options.maxEventLength ??
    0;

  const sampleRate = Math.min(
    1,
    Math.max(0, finiteNonNegative(options.sampleRate, DEFAULT_SAMPLE_RATE)),
  );

  return {
    endpoint: options.endpoint ?? '',
    ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
    debug: options.debug ?? false,
    flushIntervalMs: finiteNonNegative(options.flushIntervalMs, DEFAULT_FLUSH_INTERVAL_MS),
    maxQueueSize: finiteNonNegative(options.maxQueueSize, DEFAULT_MAX_QUEUE_SIZE),
    sampleRate,
    maxEventBytes,
    oversizedEventPolicy: options.oversizedEventPolicy ?? 'drop',
    batchSize: positiveInteger(options.batchSize, DEFAULT_BATCH_SIZE),
    headers: { ...(options.headers ?? {}) },
    ...(options.buildVersion === undefined ? {} : { buildVersion: options.buildVersion }),
    ...(environment === undefined ? {} : { environment }),
    context: { ...(options.context ?? {}) },
    deadLetterCap: positiveInteger(options.deadLetterCap, DEFAULT_DEAD_LETTER_CAP),
    circuitFailureThreshold: positiveInteger(
      options.circuitFailureThreshold,
      DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
    ),
    circuitCooldownMs: finiteNonNegative(options.circuitCooldownMs, DEFAULT_CIRCUIT_COOLDOWN_MS),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.beforeSend === undefined ? {} : { beforeSend: options.beforeSend }),
    ...(options.dedupWindowMs === undefined ? {} : { dedupWindowMs: options.dedupWindowMs }),
    ...(options.sinks === undefined ? {} : { sinks: options.sinks }),
    ...(options.emitters === undefined ? {} : { emitters: options.emitters }),
    ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
  };
}
