import type { AnalyticsEvent } from '../types.js';

export interface Emitter {
  send(event: AnalyticsEvent): void | Promise<void>;
}
