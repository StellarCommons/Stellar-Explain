/** Public API for the Stellar Explain analytics package. */
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types.js';

// Configuration
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

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
