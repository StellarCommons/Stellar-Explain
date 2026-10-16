import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';

/**
 * #97 — fan an event out to multiple sinks.
 *
 * Each child sink is invoked with `Promise.allSettled` so one slow or failing
 * sink never blocks (or rejects) the others.
 *
 * ## Why `send()` does not reject
 *
 * A failure in one child is **swallowed**: `send()` resolves once every sink has
 * been attempted, whether or not any of them succeeded.
 *
 * This is the opposite of the "surface the first rejection" variant this file
 * previously contained, and the choice is deliberate rather than accidental.
 * `AnalyticsClient.flush()` already records a failed event in its dead-letter
 * queue and logs it; if `MultiSink` rejected as well, the failure would be
 * reported twice, and a fan-out used for e.g. "console + HTTP" would stop
 * attempting the console sink because the HTTP sink failed. Attempt-all is the
 * useful property of a fan-out.
 *
 * Note: `tests/analytics-extended.test.ts` currently asserts the *opposite*
 * contract (`await expect(sink.send(event)).rejects.toThrow()`), which no
 * implementation can satisfy alongside `tests/multi-sink.test.ts`'s
 * `resolves.toBeUndefined()`. This follows `multi-sink.test.ts`.
 */
export class MultiSink implements Emitter {
  constructor(private readonly sinks: readonly Emitter[]) {}

  /** Send one event to every sink, swallowing individual failures. */
  async send(event: AnalyticsEvent): Promise<void> {
    await Promise.allSettled(
      this.sinks.map((sink) => Promise.resolve().then(() => sink.send(event))),
    );
  }

  /**
   * Send a batch to every sink that supports `sendBatch`, falling back to
   * per-event sends for the rest. `sendBatch` is optional on {@link Emitter},
   * so the capability is probed rather than assumed.
   */
  async sendBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    await Promise.allSettled(
      this.sinks.map((sink) =>
        Promise.resolve().then(() =>
          sink.sendBatch ? sink.sendBatch(events) : this.sendOneByOne(sink, events),
        ),
      ),
    );
  }

  private async sendOneByOne(sink: Emitter, events: readonly AnalyticsEvent[]): Promise<void> {
    for (const event of events) await sink.send(event);
  }

  /** The underlying sinks this fan-out was built from. */
  getSinks(): readonly Emitter[] {
    return [...this.sinks];
  }
}

/** Descriptive alias for consumers that call the fan-out component a fan-out sink. */
export const FanOutSink = MultiSink;