import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSink } from '../src/sinks/HttpSink.js';
import type { AnalyticsEvent } from '../src/types.js';

const event: AnalyticsEvent = { name: 'test', timestamp: 1, properties: {} };

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function stubNavigator(value: Record<string, unknown>): void {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
}

afterEach(() => {
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  }
  vi.unstubAllGlobals();
});

describe('HttpSink.send', () => {
  it('POSTs the event to the endpoint via fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'https://ingest.example/x' });

    await sink.send(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ingest.example/x');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(event);
  });

  it('sends the apiKey as an Authorization bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'http://x', apiKey: 'secret-key' });

    await sink.send(event);

    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer secret-key');
  });

  it('throws when the server responds non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const sink = new HttpSink({ endpoint: 'http://x' });

    await expect(sink.send(event)).rejects.toThrow('analytics HTTP 503');
  });
});

describe('HttpSink.sendBeacon (#87)', () => {
  it('is unsupported when navigator has no sendBeacon', () => {
    stubNavigator({ userAgent: 'no-beacon' });
    const sink = new HttpSink({ endpoint: 'http://x' });
    expect(sink.beaconSupported()).toBe(false);
  });

  it('uses navigator.sendBeacon when available', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    stubNavigator({ sendBeacon });
    const sink = new HttpSink({ endpoint: 'https://ingest.example/x' });

    expect(sink.beaconSupported()).toBe(true);
    expect(sink.sendBeacon(event)).toBe(true);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0];
    expect(url).toBe('https://ingest.example/x');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('falls back to a synchronous keepalive fetch when beacon is unavailable', () => {
    stubNavigator({ userAgent: 'no-beacon' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'https://ingest.example/x' });

    expect(sink.sendBeacon(event)).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
  });

  it('send() prefers beacon when useBeacon is enabled', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    stubNavigator({ sendBeacon });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const sink = new HttpSink({ endpoint: 'http://x', useBeacon: true });

    await sink.send(event);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});