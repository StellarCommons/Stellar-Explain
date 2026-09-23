import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from './index.js';

export class NoopEmitter implements Emitter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_event: AnalyticsEvent): void {
    // intentional no-op
  }
}
