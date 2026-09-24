/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types.js';

// Configuration
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

// Emitter / Sink contract
export type { Emitter } from './emitter/index.js';
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

// Environment / opt-out helpers
export { isBrowser, isNode } from './env.js';
export { OptOutManager, optOutManager } from './optout.js';
export {
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isStorageAvailable,
} from './lib/storageAvailability.js';