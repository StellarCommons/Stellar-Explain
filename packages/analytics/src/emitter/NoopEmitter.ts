import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from './index.js';

/**
 * A no-op implementation of the `Emitter` interface.
 *
 * Used as the safe default when no real transport has been configured.
 * Events are accepted and silently discarded — no I/O, no side-effects.
 */
export class NoopEmitter implements Emitter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_event: AnalyticsEvent): void {
    // Intentional no-op.
  }
}
