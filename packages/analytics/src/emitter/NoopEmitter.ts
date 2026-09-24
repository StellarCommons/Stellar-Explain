import type { Emitter } from './index.js';
import type { AnalyticsEvent } from '../types.js';

/** Safe default emitter that accepts events without performing I/O. */
export class NoopEmitter implements Emitter {
  send(_event: AnalyticsEvent): void {
    // Intentionally empty.
  }
}
