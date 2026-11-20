import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';

/**
 * #97 — fan an event out to multiple sinks.
 *
 * Each child sink is invoked with `Promise.allSettled` so one slow or failing
 * sink never blocks the others. All children are always attempted; the fan-out
 * rejects with an `AggregateError` only when every child rejected, so a partial
 * success still resolves.
 */
export class MultiSink implements Emitter {
  constructor(private readonly sinks: readonly Emitter[]) {}

  /** Send one event to every sink, surfacing a failure only if all fail. */
  async send(event: AnalyticsEvent): Promise<void> {
    const results = await Promise.allSettled(
      this.sinks.map((sink) => Promise.resolve().then(() => sink.send(event))),
    );
    this.throwIfAllFailed(results);
  }

  /**
   * Send a batch to every sink that supports `sendBatch`, falling back to
   * per-event sends for the rest. `sendBatch` is optional on {@link Emitter},
   * so the capability is probed rather than assumed.
   */
  async sendBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    const results = await Promise.allSettled(
      this.sinks.map((sink) =>
        Promise.resolve().then(() =>
          sink.sendBatch ? sink.sendBatch(events) : this.sendOneByOne(sink, events),
        ),
      ),
    );
    this.throwIfAllFailed(results);
  }

  /** Propagate cleanup to every child sink that implements it. */
  destroy(): void {
    for (const sink of this.sinks) sink.destroy?.();
  }

  private throwIfAllFailed(results: readonly PromiseSettledResult<void>[]): void {
    if (results.length === 0) return;
    const reasons = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);
    if (reasons.length === results.length) {
      throw new AggregateError(reasons, 'all sinks failed');
    }
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