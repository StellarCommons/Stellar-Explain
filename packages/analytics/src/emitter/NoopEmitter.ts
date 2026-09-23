import type { Emitter } from './index.js';
import type { AnalyticsEvent } from '../types.js';

/** An emitter that silently discards every event. Used as the default sink. */
export class NoopEmitter implements Emitter {
  send(_event: AnalyticsEvent): void {
    // intentionally empty
  }
}
