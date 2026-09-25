import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';

/** Fan-out sink that attempts every configured sink even if one fails. */
export class MultiSink implements Emitter {
  constructor(private readonly sinks: readonly Emitter[]) {}

  async send(event: AnalyticsEvent): Promise<void> {
    const results = await Promise.allSettled(
      this.sinks.map((sink) => Promise.resolve().then(() => sink.send(event))),
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure) throw failure.reason;
  }

  async sendBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    const results = await Promise.allSettled(
      this.sinks.map((sink) =>
        Promise.resolve().then(() =>
          sink.sendBatch ? sink.sendBatch!(events) : this.sendOneByOne(sink, events),
        ),
      ),
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure) throw failure.reason;
  }

  private async sendOneByOne(sink: Emitter, events: readonly AnalyticsEvent[]): Promise<void> {
    for (const event of events) await sink.send(event);
  }
}

/** Descriptive alias for consumers that call the fan-out component a fan-out sink. */
export const FanOutSink = MultiSink;
