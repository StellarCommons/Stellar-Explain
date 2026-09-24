import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpSink } from '../src/sinks/HttpSink';
import type { AnalyticsEvent } from '../src/types';

const event: AnalyticsEvent = { name: 'test', timestamp: 1, properties: {} };

describe('HttpSink', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the event to the configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    await sink.send(event);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/ingest',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(sink.getCircuitState()).toBe('closed');
  });

  it('opens the circuit after enough consecutive failures (#82)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', circuitBreaker: { failureThreshold: 2 } });

    await sink.send(event);
    await sink.send(event);

    expect(sink.getCircuitState()).toBe('open');
  });

  it('skips the network request while the circuit is open', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', circuitBreaker: { failureThreshold: 1 } });

    await sink.send(event); // fails, opens the circuit
    expect(sink.getCircuitState()).toBe('open');

    await sink.send(event); // should be skipped, not attempted
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records a failure when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const sink = new HttpSink({ endpoint: 'https://example.com/ingest', circuitBreaker: { failureThreshold: 1 } });
    await sink.send(event);

    expect(sink.getCircuitState()).toBe('open');
  });
});
