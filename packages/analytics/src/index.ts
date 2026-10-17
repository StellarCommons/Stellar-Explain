/** Public API for the Stellar Explain analytics package. */
import './utils/node-check.js';

export const ANALYTICS_PACKAGE_VERSION = '0.1.0';

// Analytics #125 — Node.js version guard (runs on import, re-exported for tests).
export {
  MINIMUM_NODE_MAJOR,
  checkNodeVersion,
  getNodeMajorVersion,
  isSupportedNodeVersion,
} from './utils/node-check.js';

// ── Core types ──────────────────────────────────────────────────────────────
export type { AnalyticsEvent } from './types.js';

// ── Configuration ───────────────────────────────────────────────────────────
export type { AnalyticsConfig, ResolvedConfig } from './config.js';
export { resolveConfig } from './config.js';

// ── Emitter / Sink contract ──────────────────────────────────────────────────
export type { Emitter, Sink } from './emitter/index.js';
export { NoopEmitter } from './emitter/NoopEmitter.js';

// ── Sinks ────────────────────────────────────────────────────────────────────
export { MultiSink, FanOutSink } from './sinks/MultiSink.js';
export { ConsoleSink } from './sinks/ConsoleSink.js';
export { HttpSink, FetchUnavailableError } from './sinks/HttpSink.js';
export type { FetchLike, HttpSinkOptions } from './sinks/HttpSink.js';

// ── Client ───────────────────────────────────────────────────────────────────
export { AnalyticsClient } from './client.js';

// ── Queuing, dedup, sampling and payload limits ──────────────────────────────
export { EventQueue } from './queue.js';
export { EventDeduplicator } from './dedup.js';
export { shouldSample } from './sampling.js';
export { limitPayload } from './utils/limitPayload.js';

// ── Validation ───────────────────────────────────────────────────────────────
export { validateProperties } from './validate.js';

// ── Logging ──────────────────────────────────────────────────────────────────
export type { LogLevel } from './lib/logger.js';
export { Logger } from './lib/logger.js';

// ── Plugins and middleware ───────────────────────────────────────────────────
export type { Plugin } from './plugins.js';
export { PluginRegistry } from './plugins.js';
export type { BeforeSendHook } from './middleware.js';
export { Middleware } from './middleware.js';

// ── Resilience primitives (#93/#94) ──────────────────────────────────────────
export { RateLimiter } from './lib/rateLimiter.js';
export { CircuitBreaker } from './lib/circuitBreaker.js';
export type { CircuitState, CircuitBreakerOptions } from './lib/circuitBreaker.js';
export { DeadLetterQueue } from './lib/DeadLetterQueue.js';

// ── Queue persistence (#85/#86) ──────────────────────────────────────────────
export {
  loadPersistedQueue,
  persistPendingQueue,
  clearPersistedQueue,
  PENDING_QUEUE_STORAGE_KEY,
  MAX_PERSISTED_EVENTS,
} from './lib/queuePersistence.js';

// ── PII scrubbing (#88/#89) ──────────────────────────────────────────────────
export {
  scrubEventProperties,
  scrubPii,
  scrubPiiString,
  SCRUBBED_EMAIL,
  SCRUBBED_LONG_NUMBER,
} from './lib/scrubPii.js';

// ── Storage availability ─────────────────────────────────────────────────────
export {
  isStorageAvailable,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from './lib/storageAvailability.js';

// ── Environment and opt-out ──────────────────────────────────────────────────
// `isNode` is deliberately not re-exported: src/env.ts does not export it yet
// (tracked separately), and re-exporting a name that does not exist is a
// compile error rather than a helpful placeholder.
export { isBrowser } from './env.js';
export { OptOutManager, optOutManager } from './optout.js';

// ── React bindings ──────────────────────────────────────────────────────────
export { AnalyticsProvider, AnalyticsContext } from './react/provider.js';
export type { AnalyticsProviderProps } from './react/provider.js';
export { useAnalytics } from './react/useAnalytics.js';
export { useTrackEvent } from './react/useTrackEvent.js';
export { usePageView } from './react/usePageView.js';

// ── Environment detection (#1084/#1085/#1086) ───────────────────────────────
export { getDeviceType } from './device.js';
export type { DeviceType } from './device.js';
export { getOsInfo } from './os.js';
export type { OsInfo } from './os.js';
export { getBrowserInfo } from './browser.js';
export type { BrowserInfo } from './browser.js';