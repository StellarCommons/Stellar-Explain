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
  debug?: boolean;
  flushIntervalMs?: number;
  maxQueueSize?: number;
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
