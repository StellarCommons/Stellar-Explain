import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSink } from '../src/sinks/HttpSink.js';
import type { AnalyticsEvent } from '../src/types.js';

const NOW_MS = 1_700_000_000_123;
const NOW_SECONDS = Math.floor(NOW_MS / 1000);

function makeEvent(name = 'timed_event'): AnalyticsEvent {
  return { name, timestamp: Date.now(), properties: {} };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HttpSink ingest timestamps', () => {
  it('sends a Date.now() timestamp in Unix seconds', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'https://ingest.example.test/events' });

    await sink.send(makeEvent());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).timestamp).toBe(NOW_SECONDS);
  });

  it('sends batched Date.now() timestamps in Unix seconds', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'https://ingest.example.test/events' });

    await sink.sendBatch([makeEvent('first'), makeEvent('second')]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).map((event: AnalyticsEvent) => event.timestamp)).toEqual([
      NOW_SECONDS,
      NOW_SECONDS,
    ]);
  });

  it('sends a beacon Date.now() timestamp in Unix seconds', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    vi.stubGlobal('navigator', {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'https://ingest.example.test/events' });

    expect(sink.sendBeacon(makeEvent())).toBe(true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).timestamp).toBe(NOW_SECONDS);
  });
});
