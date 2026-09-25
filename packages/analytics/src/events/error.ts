import { AnalyticsEvent } from '../types.js';

/** Stack traces are truncated to this many characters before being attached. */
const MAX_STACK_LENGTH = 500;

/**
 * Builds an `error` event capturing the error message and a truncated
 * stack trace (Analytics #66).
 *
 * Wired to a global `window.onerror`/`error` listener behind the
 * `captureGlobalErrors` config flag (see `AnalyticsClient`'s constructor),
 * but also callable directly via `client.trackError()` for a host app
 * reporting an error it caught itself.
 */
export function createErrorEvent(message: string, stack?: string): AnalyticsEvent {
  const truncatedStack =
    stack && stack.length > MAX_STACK_LENGTH ? stack.slice(0, MAX_STACK_LENGTH) : stack;

  return {
    name: 'error',
    timestamp: Date.now(),
    properties: {
      message,
      ...(truncatedStack !== undefined ? { stack: truncatedStack } : {}),
    },
  };
}
