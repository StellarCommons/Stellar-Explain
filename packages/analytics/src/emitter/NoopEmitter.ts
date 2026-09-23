import type { Emitter } from './index.js';
import type { AnalyticsEvent } from '../types.js';

/** No-op emitter — swallows all events. Used as the default. */
export class NoopEmitter implements Emitter {
  send(_event: AnalyticsEvent): void {
    // intentionally empty
import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from './index.js';

export class NoopEmitter implements Emitter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_event: AnalyticsEvent): void {
    // intentional no-op
import type { AnalyticsEvent } from '../types';
import type { Emitter } from './index';

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
