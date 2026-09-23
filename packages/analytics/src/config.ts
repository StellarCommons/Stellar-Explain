/** Configuration for AnalyticsClient. */
export interface AnalyticsConfig {
  /** Enable debug logging. */
  debug?: boolean;
  /**
   * Milliseconds between automatic flushes.
   * Set to 0 (or omit) to disable the auto-flush timer.
   */
  flushIntervalMs?: number;
  /**
   * Maximum number of events held in the queue.
   * When exceeded, the oldest event is dropped and a warning is logged.
   * Set to 0 for unlimited.
   */
  maxQueueSize?: number;
}

export function resolveConfig(partial: AnalyticsConfig = {}): Required<AnalyticsConfig> {
  return {
    debug: partial.debug ?? false,
    flushIntervalMs: partial.flushIntervalMs ?? 0,
    maxQueueSize: partial.maxQueueSize ?? 100,
  };
}
