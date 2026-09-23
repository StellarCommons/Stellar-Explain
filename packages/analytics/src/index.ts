/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

export type { AnalyticsEvent } from './types.js';
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';
export type { Emitter } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';
export { EventQueue } from './queue.js';
export { AnalyticsClient } from './client.js';
