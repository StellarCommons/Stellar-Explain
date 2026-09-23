import type { AnalyticsEvent } from '../types.js';

/** Contract for event emitters / sinks. */
import type { AnalyticsEvent } from '../types';

/**
 * Contract for all event emitters used by the analytics client.
 *
 * Implementations may be synchronous (return `void`) or asynchronous
 * (return `Promise<void>`).
 */
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
}
