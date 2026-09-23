/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

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
