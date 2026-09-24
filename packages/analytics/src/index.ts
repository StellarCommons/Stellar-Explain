/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
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

// React bindings
export { AnalyticsProvider, AnalyticsContext } from './react/provider.js';
export type { AnalyticsProviderProps } from './react/provider.js';
export { useAnalytics } from './react/useAnalytics.js';
