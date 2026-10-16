import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from './index.js';

/** An emitter that silently discards every event. Used as the default sink. */
export class NoopEmitter implements Emitter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_event: AnalyticsEvent): void {
    // Intentional no-op. The parameter is prefixed with `_` because the
    // interface requires the signature; `tests/noop-emitter.test.ts` asserts
    // that send() returns `undefined` and touches no side effect, which is the
    // whole contract of this class.
  }
}