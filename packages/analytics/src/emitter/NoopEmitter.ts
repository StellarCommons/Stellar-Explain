import type { Emitter } from './index.js';
import type { AnalyticsEvent } from '../types.js';

export class NoopEmitter implements Emitter {
  send(_event: AnalyticsEvent): void {
    // intentional no-op
  }
}
