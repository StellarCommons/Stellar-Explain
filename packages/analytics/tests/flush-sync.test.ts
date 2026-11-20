import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient } from '../src/index.js';
import type { AnalyticsEvent } from '../src/index.js';

describe('#92 AnalyticsClient.flushSync()', () => {
  it('sends the provided event immediately without enqueueing it', () => {
    let received: AnalyticsEvent | undefined;
    const client = new AnalyticsClient({}, {
      send: (event) => {
        received = event;
      },
    });

    const event: AnalyticsEvent = { name: 'direct', timestamp: 7, properties: {} };
    client.flushSync(event);

    expect(received?.name).toBe('direct');
    expect(client.getQueue().size).toBe(0);
  });

  it('drains and sends the pending queue when called without an event', () => {
    const sent: string[] = [];
    const client = new AnalyticsClient({}, {
      send: (event) => {
        sent.push(event.name);
      },
    });

    client.track('queued_one');
    client.track('queued_two');
    client.flushSync();

    expect(sent).toEqual(['queued_one', 'queued_two']);
    expect(client.getQueue().size).toBe(0);
  });

  it('does not wait for async emitters (best-effort) and never throws', async () => {
    const failing = {
      send: vi.fn().mockRejectedValue(new Error('async failure')),
    };
    const client = new AnalyticsClient({}, failing);
    client.track('doomed');

    expect(() => client.flushSync()).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getDeadLetter().size).toBe(1);
  });

  it('routes synchronous emitter failures to the dead-letter', () => {
    const client = new AnalyticsClient({}, {
      send: () => {
        throw new Error('sync failure');
      },
    });
    client.track('doomed');

    client.flushSync();

    expect(client.getDeadLetter().size).toBe(1);
  });
});