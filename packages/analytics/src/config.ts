import type { AnalyticsEvent } from './types.js';

export interface AnalyticsConfig {
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
