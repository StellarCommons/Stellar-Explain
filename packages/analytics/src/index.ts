/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

export type { AnalyticsEvent } from './types.js';
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';
export { Logger } from './lib/logger.js';
export { EventQueue } from './queue.js';
export { validateProperties } from './validate.js';
export { AnalyticsClient } from './client.js';
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink } from './sinks/HttpSink.js';
export type { HttpSinkOptions } from './sinks/HttpSink.js';
