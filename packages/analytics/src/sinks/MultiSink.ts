import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';

/**
 * #97 — fan an event out to multiple sinks.
 *
 * Each child sink is invoked with `Promise.allSettled` so one slow or
 * failing sink never blocks (or rejects) the others.
 */
export class MultiSink implements Emitter {
  constructor(private readonly sinks: readonly Emitter[]) {}

  async send(event: AnalyticsEvent): Promise<void> {
    await Promise.allSettled(
      this.sinks.map((sink) => Promise.resolve().then(() => sink.send(event))),
    );
  }

  /** The underlying sinks this fan-out was built from. */
  getSinks(): readonly Emitter[] {
    return [...this.sinks];
  }
}