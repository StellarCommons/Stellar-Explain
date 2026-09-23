/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types
export type { AnalyticsEvent } from './types';

// Configuration
export type { AnalyticsConfig } from './config';
export { resolveConfig } from './config';

// Client
export { AnalyticsClient } from './client';

// Logger
export type { LogLevel } from './lib/logger';
export { Logger } from './lib/logger';

// Property validation
export { validateProperties } from './validate';

// Emitter
export type { Emitter } from './emitter/index';
export { NoopEmitter } from './emitter/NoopEmitter';
