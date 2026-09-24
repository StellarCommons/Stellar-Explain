/** Public API for the Stellar Explain analytics package. */
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

export type {
  AnalyticsEvent,
  AnalyticsLifecycleEvent,
  AnalyticsLifecycleHandler,
  AnalyticsLifecyclePayload,
  AnalyticsMetrics,
} from './types.js';
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';
export { EventQueue } from './queue.js';
export type { QueueDropReason } from './queue.js';
export { AnalyticsClient } from './client.js';

export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink, FetchUnavailableError } from './sinks/HttpSink.js';
export type { FetchLike, HttpSinkOptions } from './sinks/HttpSink.js';
export { FanOutSink, MultiSink } from './sinks/MultiSink.js';

export type { LogLevel, AnalyticsLogRecord } from './lib/logger.js';
export { Logger } from './lib/logger.js';
export type { CircuitState, CircuitBreakerOptions } from './lib/circuitBreaker.js';
export { CircuitBreaker } from './lib/circuitBreaker.js';

export { validateProperties } from './validate.js';
export { shouldSample } from './sampling.js';
export { EventDeduplicator } from './dedup.js';
export { eventByteLength, isWithinByteLimit, serializedByteLength } from './utils/eventSize.js';
export { limitPayload } from './utils/limitPayload.js';
export type { AnalyticsPlugin } from './plugins.js';
export { applyPlugins } from './plugins.js';
export { runMiddleware } from './middleware.js';
export type { BeforeSend, MiddlewareOptions } from './middleware.js';
