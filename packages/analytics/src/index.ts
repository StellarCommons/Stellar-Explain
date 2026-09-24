/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types.js';

// Configuration
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

// Emitter / Sink contract
export type { Emitter, Sink } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// Queuing
export { EventQueue } from './queue.js';

// Client
export { AnalyticsClient } from './client.js';

// Logging
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

// Environment / opt-out helpers
export { isBrowser, isNode } from './env.js';
export { OptOutManager, optOutManager } from './optout.js';
export {
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isStorageAvailable,
} from './lib/storageAvailability.js';