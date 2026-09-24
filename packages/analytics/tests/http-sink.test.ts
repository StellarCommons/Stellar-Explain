import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSink } from '../src/index.js';
import type { AnalyticsEvent } from '../src/index.js';

const event = (name: string): AnalyticsEvent => ({
  name,
  timestamp: 1_700_000_000_000,
  properties: { path: `/${name}` },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpSink compression and headers', () => {
  it('falls back to plain JSON when CompressionStream is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const sink = new HttpSink({
      endpoint: 'https://ingest.example.test/events',
      compression: true,
      fetchImpl,
    });

    await sink.send(event('plain'));

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(typeof init.body).toBe('string');
    expect((init.headers as Record<string, string>)['Content-Encoding']).toBeUndefined();
  });

  it('uses the caller headers for every batch chunk without mutating them', async () => {
    const calls: RequestInit[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init ?? {});
      return { ok: true, status: 200 };
    });
    const headers = { 'X-Trace': 'trace-1' };
    const sink = new HttpSink({
      endpoint: 'https://ingest.example.test/events',
      headers,
      batchSize: 1,
      fetchImpl,
    });

    await sink.sendBatch([event('one'), event('two')]);

    expect(calls).toHaveLength(2);
    expect((calls[0].headers as Record<string, string>)['X-Trace']).toBe('trace-1');
    expect((calls[1].headers as Record<string, string>)['X-Trace']).toBe('trace-1');
    expect(headers).toEqual({ 'X-Trace': 'trace-1' });
  });

  it('rejects invalid batch sizes instead of looping forever', () => {
    expect(
      () => new HttpSink({ endpoint: 'https://ingest.example.test/events', batchSize: 0 }),
    ).toThrow(RangeError);
    expect(
      () => new HttpSink({ endpoint: 'https://ingest.example.test/events', batchSize: 1.5 }),
    ).toThrow(RangeError);
  });
});
