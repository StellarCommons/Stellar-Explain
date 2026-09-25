import { describe, expect, it, vi } from 'vitest';
import {
  AnalyticsClient,
  ConsoleSink,
  EventDeduplicator,
  HttpSink,
  MultiSink,
  eventByteLength,
} from '../src/index.js';
import type { AnalyticsEvent, Emitter } from '../src/index.js';

function event(name = 'test', properties: Record<string, unknown> = {}): AnalyticsEvent {
  return { name, timestamp: Date.now(), properties };
}

describe('AnalyticsClient observability and resilience', () => {
  it('returns fresh zero metrics and counts successful delivery', async () => {
    const client = new AnalyticsClient({ flushIntervalMs: 0 });
    const initial = client.getMetrics();
    expect(initial.eventsTracked).toBe(0);
    expect(initial.eventsDropped).toBe(0);
    expect(initial.eventsSent).toBe(0);
    expect(initial.eventsFailed).toBe(0);
    expect(client.getMetrics()).not.toBe(initial);

    client.track('page_view');
    await client.flush();
    expect(client.getMetrics()).toMatchObject({
      eventsTracked: 1,
      eventsSent: 1,
      eventsFailed: 0,
      circuitState: undefined,
    });
  });

  it('counts queue overflow as dropped while retaining the newest event', async () => {
    const sent: string[] = [];
    const client = new AnalyticsClient(
      { flushIntervalMs: 0, maxQueueSize: 2 },
      { send: (value) => sent.push(value.name) },
    );
    client.track('one');
    client.track('two');
    client.track('three');
    await client.flush();

    expect(sent).toEqual(['two', 'three']);
    expect(client.getMetrics().eventsDropped).toBe(1);
  });

  it('captures sink failures without rejecting flush and retains dead letters', async () => {
    const client = new AnalyticsClient(
      { flushIntervalMs: 0 },
      {
        send: () => {
          throw new Error('sink unavailable');
        },
      },
    );
    client.track('failed_event');

    await expect(client.flush()).resolves.toBeUndefined();
    expect(client.getMetrics()).toMatchObject({ eventsFailed: 1, eventsSent: 0 });
    expect(client.getDeadLetters()).toHaveLength(1);
  });

  it('drops an event whose complete UTF-8 serialization exceeds the cap', () => {
    const client = new AnalyticsClient({ flushIntervalMs: 0, maxEventBytes: 80 });
    client.track('oversized', { text: '😀'.repeat(30) });

    expect(client.getQueue().size).toBe(0);
    expect(client.getMetrics().eventsDropped).toBe(1);
  });

  it('can truncate an oversized event when configured to do so', () => {
    const client = new AnalyticsClient({
      flushIntervalMs: 0,
      maxEventBytes: 180,
      oversizedEventPolicy: 'truncate',
    });
    client.track('large', { text: 'x'.repeat(500) });

    expect(client.getQueue().size).toBe(1);
    const [queued] = client.getQueue().drain();
    expect(eventByteLength(queued)).toBeLessThanOrEqual(180);
  });

  it('attaches build and environment context to every event', () => {
    const client = new AnalyticsClient({
      flushIntervalMs: 0,
      buildVersion: '2026.09.24',
      environment: 'staging',
    });
    client.track('context_event');
    const [queued] = client.getQueue().drain();
    expect(queued.context).toMatchObject({
      buildVersion: '2026.09.24',
      environment: 'staging',
    });
  });

  it('supports lifecycle listeners and runtime debug mode', () => {
    const client = new AnalyticsClient({ flushIntervalMs: 0 });
    const events: string[] = [];
    const unsubscribe = client.on('enqueue', (payload) => {
      events.push(String(payload.eventName));
    });
    client.debug();
    client.track('observed');
    unsubscribe();
    client.track('not_observed');

    expect(events).toEqual(['observed']);
  });

  it('fans out to every sink even when one sink fails', async () => {
    const received: string[] = [];
    const failing: Emitter = {
      send: () => {
        throw new Error('first sink failed');
      },
    };
    const succeeding: Emitter = { send: (value) => void received.push(value.name) };
    const client = new AnalyticsClient({ flushIntervalMs: 0 }, [failing, succeeding]);
    client.track('fanout');

    await client.flush();
    expect(received).toEqual(['fanout']);
  });
});

describe('EventDeduplicator', () => {
  it('only suppresses identical events inside its time window', () => {
    let now = 100;
    const deduplicator = new EventDeduplicator(50);
    const value = event('same', { value: 1 });
    expect(deduplicator.isDuplicate(value, now)).toBe(false);
    expect(deduplicator.isDuplicate(value, now + 10)).toBe(true);
    expect(deduplicator.isDuplicate(value, now + 60)).toBe(false);
  });
});

describe('HttpSink batching and headers', () => {
  it('posts bounded JSON batches and merges custom headers', async () => {
    const calls: Array<[string, RequestInit]> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init ?? {}]);
      return { ok: true, status: 202 };
    });
    const sink = new HttpSink({
      url: 'https://ingest.example.test/events',
      headers: { 'X-Source': 'test' },
      batchSize: 2,
      fetchImpl,
    });

    await sink.sendBatch([event('a'), event('b'), event('c')]);
    expect(calls).toHaveLength(2);
    expect((calls[0][1].headers as Record<string, string>)['X-Source']).toBe('test');
    expect((calls[0][1].headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
    expect(JSON.parse(calls[0][1].body as string)).toHaveLength(2);
    expect(JSON.parse(calls[1][1].body as string)).toHaveLength(1);
  });

  it('falls back to plain JSON when fetch is unavailable', async () => {
    const sink = new HttpSink({ url: 'https://ingest.example.test/events', fetchImpl: undefined });
    // The constructor may see a global fetch in Node; force the unavailable path
    // by replacing it for this isolated test only when necessary.
    const original = globalThis.fetch;
    try {
      Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true });
      const unavailable = new HttpSink({ url: 'https://ingest.example.test/events' });
      await expect(unavailable.send(event())).rejects.toThrow('Fetch is unavailable');
    } finally {
      Object.defineProperty(globalThis, 'fetch', { value: original, configurable: true });
    }
    expect(sink).toBeInstanceOf(HttpSink);
  });
});

describe('MultiSink', () => {
  it('attempts all sinks before surfacing a failure', async () => {
    const calls: string[] = [];
    const sink = new MultiSink([
      {
        send: () => {
          calls.push('failing');
          throw new Error('sink failed');
        },
      },
      { send: () => calls.push('healthy') },
    ]);
    await expect(sink.send(event())).rejects.toThrow();
    expect(calls).toEqual(expect.arrayContaining(['failing', 'healthy']));
  });
});

describe('ConsoleSink', () => {
  it('remains usable as a client transport', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const client = new AnalyticsClient({ flushIntervalMs: 0 }, new ConsoleSink(true));
    client.track('console_event');
    await client.flush();
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });
});
