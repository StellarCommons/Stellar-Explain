import type { Emitter } from './index.js';
import type { AnalyticsEvent } from '../types.js';

/** No-op emitter — swallows all events. Used as the default. */
export class NoopEmitter implements Emitter {
  send(_event: AnalyticsEvent): void {
    // intentionally empty
  }
}
