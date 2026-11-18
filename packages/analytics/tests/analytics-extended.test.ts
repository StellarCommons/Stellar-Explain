import { describe, expect, it, vi } from 'vitest';
import {
  AnalyticsClient,
  ConsoleSink,
  EventDeduplicator,
  HttpSink,
  MultiSink,
} from '../src/index.js';
import type { AnalyticsEvent, Emitter } from '../src/index.js';

function event(name = 'test', properties: Record<string, unknown> = {}): AnalyticsEvent {
  return { name, timestamp: Date.now(), properties };
}

describe('AnalyticsClient resilience', () => {
  it('retains the newest events when the queue overflows', async () => {
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
    expect(client.getDeadLetter().drain().map((item) => item.name)).toEqual(['failed_event']);
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

    await expect(client.flush()).resolves.toBeUndefined();
    expect(received).toEqual(['fanout']);
  });
});

describe('EventDeduplicator', () => {
  it('only suppresses identical events inside its time window', () => {
    const now = 100;
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
      endpoint: 'https://ingest.example.test/events',
      headers: { 'X-Source': 'test' },
      batchSize: 2,
      fetchImpl,
    });

    await sink.sendBatch([event('a'), event('b'), event('c')]);
    expect(calls).toHaveLength(2);
    expect((calls[0][1].headers as Record<string, string>)['X-Source']).toBe('test');
    expect((calls[0][1].headers as Record<string, string>)['content-type']).toBe(
      'application/json',
    );
    expect(JSON.parse(calls[0][1].body as string)).toHaveLength(2);
    expect(JSON.parse(calls[1][1].body as string)).toHaveLength(1);
  });

  it('rejects when fetch is unavailable', async () => {
    const original = globalThis.fetch;
    try {
      Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true });
      const sink = new HttpSink({ endpoint: 'https://ingest.example.test/events' });
      await expect(sink.send(event())).rejects.toThrow('Fetch is unavailable');
    } finally {
      Object.defineProperty(globalThis, 'fetch', { value: original, configurable: true });
    }
  });
});

describe('MultiSink', () => {
  it('resolves when at least one sink succeeds', async () => {
    const received: string[] = [];
    const sink = new MultiSink([
      {
        send: () => {
          throw new Error('first sink failed');
        },
      },
      { send: (value) => void received.push(value.name) },
    ]);

    await expect(sink.send(event())).resolves.toBeUndefined();
    expect(received).toEqual(['test']);
  });

  it('throws an AggregateError when every sink fails', async () => {
    const sink = new MultiSink([
      {
        send: () => {
          throw new Error('first sink failed');
        },
      },
      {
        send: () => {
          throw new Error('second sink failed');
        },
      },
    ]);

    await sink.send(event()).catch((error) => {
      expect(error).toBeInstanceOf(AggregateError);
    });
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
