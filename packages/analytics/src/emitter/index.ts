import type { AnalyticsEvent } from '../types.js';

/** Contract that every event sink must satisfy. */
export interface Emitter {
  send(event: AnalyticsEvent): void;
}
