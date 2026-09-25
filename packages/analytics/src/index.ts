/** Public API for the Stellar Explain analytics package. */
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types.js';

// Configuration
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

// Emitter / Sink contract
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Multi-sink fan-out (#97)
export { MultiSink } from './sinks/MultiSink.js';

// Plugins (#98)
export type { Plugin } from './plugins.js';
export { PluginRegistry } from './plugins.js';

// Middleware (#99)
export type { BeforeSendHook } from './middleware.js';
export { Middleware } from './middleware.js';
export type { Emitter, Sink } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Queuing
export { EventQueue } from './queue.js';

// Emitter / Sink contract
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Queuing
export { EventQueue } from './queue.js';





// Emitter
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Queue
export { EventQueue } from './queue.js';

// Client
export { AnalyticsClient } from './client.js';

// Logger
export type { LogLevel } from './lib/logger.js';
export { Logger } from './lib/logger.js';

// Property validation
export { validateProperties } from './validate.js';

// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { resolveConfig } from './config.js';
export type { AnalyticsConfig, ResolvedConfig } from './config.js';

// Environment
export { isBrowser } from './env.js';

// Emitter
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Queue
export { EventQueue } from './queue.js';
// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink } from './sinks/HttpSink.js';
export type { HttpSinkOptions } from './sinks/HttpSink.js';

// Queue
export { EventQueue } from './queue.js';

// Deduplication
export { EventDeduplicator } from './dedup.js';

// Sampling
export { shouldSample } from './sampling.js';

// Payload limiting
export { limitPayload } from './utils/limitPayload.js';

// Validation
export { validateProperties } from './validate.js';

// Client
export { AnalyticsClient } from './client.js';

// Logging
// Logger
export type { LogLevel } from './lib/logger.js';
export { Logger } from './lib/logger.js';

// Property validation
export { validateProperties } from './validate.js';

// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink } from './sinks/HttpSink.js';
export type { HttpSinkOptions } from './sinks/HttpSink.js';

// Resilience primitives (#93/#94)
export { RateLimiter } from './lib/rateLimiter.js';
export type { CircuitState, CircuitBreakerOptions } from './lib/CircuitBreaker.js';
export { CircuitBreaker } from './lib/CircuitBreaker.js';
export { DeadLetterQueue } from './lib/DeadLetterQueue.js';

// Queue persistence (#95)
export {
  loadPersistedQueue,
  persistPendingQueue,
  clearPersistedQueue,
  PENDING_QUEUE_STORAGE_KEY,
  MAX_PERSISTED_EVENTS,
} from './lib/queuePersistence.js';
// PII scrubbing
export {
  scrubEventProperties,
  scrubPii,
  scrubPiiString,
  SCRUBBED_EMAIL,
  SCRUBBED_LONG_NUMBER,
} from './lib/scrubPii.js';

// Queue persistence (#85/#86)
export {
  loadPersistedQueue,
  persistPendingQueue,
  clearPersistedQueue,
  PENDING_QUEUE_STORAGE_KEY,
  MAX_PERSISTED_EVENTS,
} from './lib/queuePersistence.js';
// Dead-letter (#91)
export { DeadLetterQueue } from './lib/DeadLetterQueue.js';

// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';

// Environment / opt-out helpers
export { isBrowser, isNode } from './env.js';
export { OptOutManager, optOutManager } from './optout.js';
export {
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isStorageAvailable,
} from './lib/storageAvailability.js';
} from './lib/storageAvailability.js';

// Circuit breaker
export { CircuitBreaker } from './lib/circuitBreaker.js';
export type { CircuitState, CircuitBreakerOptions } from './lib/circuitBreaker.js';

// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink } from './sinks/HttpSink.js';
export type { HttpSinkOptions } from './sinks/HttpSink.js';
// Sinks
export { ConsoleSink } from './sinks/ConsoleSink.js';

// React bindings
export { AnalyticsProvider, AnalyticsContext } from './react/provider.js';
export type { AnalyticsProviderProps } from './react/provider.js';
export { useAnalytics } from './react/useAnalytics.js';
export { useTrackEvent } from './react/useTrackEvent.js';
export { usePageView } from './react/usePageView.js';
// Device detection (#1084)
export { getDeviceType } from './device.js';
export type { DeviceType } from './device.js';

// OS detection (#1085)
export { getOsInfo } from './os.js';
export type { OsInfo } from './os.js';

// Browser detection (#1086)
export { getBrowserInfo } from './browser.js';
export type { BrowserInfo } from './browser.js';
export type { AnalyticsEvent } from './types.js';
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';
export { Logger } from './lib/logger.js';
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';
export { validateProperties } from './validate.js';
export { EventQueue } from './queue.js';
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink } from './sinks/HttpSink.js';
export type { HttpSinkOptions } from './sinks/HttpSink.js';
export { AnalyticsClient } from './client.js';

// #1079 — Event deduplication
export { EventDeduplicator } from './dedup.js';

// #1080 — Payload size limiting
export { limitPayload } from './utils/limitPayload.js';

// #1081 — Sampling support
export { shouldSample } from './sampling.js';
