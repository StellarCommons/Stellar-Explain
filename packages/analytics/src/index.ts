/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types.js';

// Configuration
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
