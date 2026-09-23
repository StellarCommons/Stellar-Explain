/** @stellar-explain/analytics — rebuilt from scratch, see tracked "Analytics #1..#125" issues. */

// Package version
export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Core types (issue #1059)
export type { AnalyticsEvent } from './types.js';

// Client configuration (issue #1060)
export type { AnalyticsConfig } from './config.js';
export { resolveConfig } from './config.js';

// SSR-safe environment detection (issue #1061)
export { isBrowser, isNode } from './env.js';

// Analytics client (issue #1062)
export { AnalyticsClient } from './client.js';

// Opt-out and page context
export * from './optout.js';
export * from './context/page.js';