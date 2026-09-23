export interface AnalyticsConfig {
  debug?: boolean;
  flushIntervalMs?: number;
  maxQueueSize?: number;
}

export function resolveConfig(partial: AnalyticsConfig = {}): Required<AnalyticsConfig> {
  return {
    debug: partial.debug ?? false,
    flushIntervalMs: partial.flushIntervalMs ?? 5000,
    maxQueueSize: partial.maxQueueSize ?? 100,
  };
}
