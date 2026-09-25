import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpSink } from '../src/sinks/HttpSink.js';
import { AnalyticsClient } from '../src/client.js';
import type { AnalyticsEvent } from '../src/types.js';

const makeEvent = (name = 'test_event'): AnalyticsEvent => ({
  name,
  timestamp: 1000,
  properties: { foo: 'bar' },
});

const makeOkResponse = () =>
  ({ ok: true, status: 200 } as Response);

const makeFailResponse = (status = 500) =>
  ({ ok: false, status } as Response);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('HttpSink — successful POST', () => {
  it('POSTs the event as JSON to the configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    const event = makeEvent();
    await sink.send(event);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/ingest');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify([event]));
  });

  it('sets Content-Type: application/json header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    await sink.send(makeEvent());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sets Authorization header when apiKey is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', apiKey: 'secret-key' });
    await sink.send(makeEvent());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret-key');
  });

  it('does not set Authorization header when apiKey is not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    await sink.send(makeEvent());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('does not add to dead letters on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOkResponse()));

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    await sink.send(makeEvent());

    expect(sink.getDeadLetters()).toHaveLength(0);
  });
});

describe('HttpSink — retry on failure (#1076)', () => {
  it('retries on a failed POST and succeeds on the retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeFailResponse(503))
      .mockResolvedValueOnce(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', baseDelayMs: 10 });
    const sendPromise = sink.send(makeEvent());
    // advance timer past first backoff delay (10ms * 2^0 = 10ms)
    await vi.runAllTimersAsync();
    await sendPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sink.getDeadLetters()).toHaveLength(0);
  });

  it('retries up to maxRetries times before dead-lettering', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 2, baseDelayMs: 10 });
    const sendPromise = sink.send(makeEvent());
    await vi.runAllTimersAsync();
    await sendPromise;

    // 1 initial + 2 retries = 3 total calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('HttpSink — exponential backoff (#1077)', () => {
  it('waits baseDelayMs * 2^(attempt-1) between retries', async () => {
    const delays: number[] = [];
    const realSetTimeout = globalThis.setTimeout;

    // Capture the delay passed to setTimeout (not vitest timers)
    const setTimeoutSpy = vi.fn().mockImplementation((fn: () => void, ms: number) => {
      delays.push(ms);
      return realSetTimeout(fn, 0); // execute immediately in tests
    });
    vi.stubGlobal('setTimeout', setTimeoutSpy);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeFailResponse(500))
      .mockResolvedValueOnce(makeFailResponse(500))
      .mockResolvedValueOnce(makeOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const baseDelayMs = 100;
    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 3, baseDelayMs });
    await sink.send(makeEvent());

    // attempt=1 => 100 * 2^0 = 100ms, attempt=2 => 100 * 2^1 = 200ms
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
  });
});

describe('HttpSink — dead-letter list (#1078)', () => {
  it('adds event to dead letters when all retries are exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const event = makeEvent('dead_event');
    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 1, baseDelayMs: 10 });
    const sendPromise = sink.send(event);
    await vi.runAllTimersAsync();
    await sendPromise;

    const deadLetters = sink.getDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toEqual(event);
  });

  it('getDeadLetters returns a copy, not the internal array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 0, baseDelayMs: 10 });
    await sink.send(makeEvent());

    const letters = sink.getDeadLetters();
    letters.pop(); // mutate the copy
    expect(sink.getDeadLetters()).toHaveLength(1); // original unaffected
  });

  it('clearDeadLetters empties the dead-letter list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 0, baseDelayMs: 10 });
    await sink.send(makeEvent());

    expect(sink.getDeadLetters()).toHaveLength(1);
    sink.clearDeadLetters();
    expect(sink.getDeadLetters()).toHaveLength(0);
  });

  it('accumulates multiple dead-letter events', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 0, baseDelayMs: 10 });
    await sink.send(makeEvent('e1'));
    await sink.send(makeEvent('e2'));
    await sink.send(makeEvent('e3'));

    expect(sink.getDeadLetters()).toHaveLength(3);
  });
});

describe('AnalyticsClient.getDeadLetters() — integration (#1078)', () => {
  it('delegates to HttpSink.getDeadLetters() when emitter is HttpSink', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeFailResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', maxRetries: 0, baseDelayMs: 10 });
    const client = new AnalyticsClient(sink, { flushIntervalMs: 0, debug: false });

    client.track('fail_event');
    await client.flush();

    const deadLetters = client.getDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]?.name).toBe('fail_event');
  });

  it('returns empty array when emitter is not HttpSink', () => {
    const { NoopEmitter } = require('../src/emitter/NoopEmitter.js');
    const client = new AnalyticsClient(new NoopEmitter(), { flushIntervalMs: 0, debug: false });
    expect(client.getDeadLetters()).toEqual([]);
  });
});
