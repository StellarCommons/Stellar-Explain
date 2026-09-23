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

// Event builders
export * from './events/form.js';
export * from './events/copy.js';
// Storage availability and locale capture
export * from './lib/storageAvailability.js';
export * from './locale.js';
// User and group analytics
export * from './user.js';
export * from './group.js';
// Opt-out and page context
export * from './optout.js';
export * from './context/page.js';
// Event builders
export * from './events/click.js';
export * from './events/page-view.js';
export * from './events/search.js';
export * from './events/focus.js';
