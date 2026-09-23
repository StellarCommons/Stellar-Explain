import type { AnalyticsEvent } from '../types.js';

/** Contract for event emitters / sinks. */
export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
}
