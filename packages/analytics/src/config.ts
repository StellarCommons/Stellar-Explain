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
}
