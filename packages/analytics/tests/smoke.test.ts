import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_PACKAGE_VERSION,
  AnalyticsClient,
} from '../src/index';
import type { Emitter } from '../src/emitter/index';
import type { AnalyticsEvent } from '../src/types';

describe('analytics package foundation', () => {
  it('builds and exports a version', () => {
    expect(ANALYTICS_PACKAGE_VERSION).toBe('0.1.0');
  });
});

/**
 * Analytics #124 — end-to-end smoke test for the fully assembled package.
 *
 * Exercises the public barrel (`src/index.ts`) only: construct a real
 * `AnalyticsClient`, track an event, flush, and assert it reached a fake
 * sink. No network, no timers — the fake sink records synchronously.
 */
class FakeSink implements Emitter {
  public readonly received: AnalyticsEvent[] = [];

  send(event: AnalyticsEvent): void {
    this.received.push(event);
  }
}

describe('analytics package smoke (assembled client → sink)', () => {
  it('tracks an event and delivers it to the sink on flush', async () => {
    const sink = new FakeSink();
    const client = new AnalyticsClient(
      { endpoint: 'http://localhost', debug: false },
      sink,
    );

    expect(sink.received).toHaveLength(0);

    client.track('smoke_event', { source: 'smoke-test' });
    expect(sink.received).toHaveLength(0); // queued, not yet delivered

    await client.flush();

    expect(sink.received).toHaveLength(1);
    expect(sink.received[0].name).toBe('smoke_event');
    expect(sink.received[0].properties).toMatchObject({
      source: 'smoke-test',
    });
    expect(typeof sink.received[0].timestamp).toBe('number');

    client.destroy();
  });

  it('queues multiple events and delivers them in order', async () => {
    const sink = new FakeSink();
    const client = new AnalyticsClient({ endpoint: 'http://localhost' }, sink);

    client.track('smoke_first', { order: 1 });
    client.track('smoke_second', { order: 2 });

    await client.flush();

    expect(sink.received.map((event) => event.name)).toEqual([
      'smoke_first',
      'smoke_second',
    ]);

    client.destroy();
  });

  it('flush on an empty queue delivers nothing', async () => {
    const sink = new FakeSink();
    const client = new AnalyticsClient({ endpoint: 'http://localhost' }, sink);

    await expect(client.flush()).resolves.toBeUndefined();
    expect(sink.received).toHaveLength(0);

    client.destroy();
  });
});
