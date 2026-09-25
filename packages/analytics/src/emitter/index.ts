import type { AnalyticsEvent } from '../types.js';

/**
 * Contract for all event emitters used by the analytics client.
 *
 * Implementations may be synchronous (return `void`) or asynchronous
 * (return `Promise<void>`).
 */
/** Contract that every event sink must satisfy. */
export interface Emitter {
  send(event: AnalyticsEvent): void;
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
}
