import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient, HttpSink } from '../src/index.js';
import type { AnalyticsEvent, Emitter } from '../src/index.js';

describe('full-pipeline failure recovery', () => {
  it('opens the circuit, records dead letters, and closes after a successful probe', async () => {
    let shouldFail = true;
    const delivered: string[] = [];
    const sink: Emitter = {
      send(event: AnalyticsEvent) {
        if (shouldFail) throw new Error('network outage');
        delivered.push(event.name);
      },
    };
    const client = new AnalyticsClient(
      {
        flushIntervalMs: 0,
        circuitFailureThreshold: 2,
        circuitCooldownMs: 0,
        deadLetterCap: 10,
      },
      sink,
    );

    client.track('outage_1');
    await client.flush();
    client.track('outage_2');
    await client.flush();

    expect(client.getCircuitState()).toBe('open');
    expect(client.getCircuitOpenCount()).toBe(1);
    expect(client.getDeadLetters()).toHaveLength(2);
    expect(client.getMetrics().eventsFailed).toBe(2);

    shouldFail = false;
    client.track('recovered');
    await client.flush();

    expect(client.getCircuitState()).toBe('closed');
    expect(delivered).toEqual(['recovered']);
    expect(client.getMetrics().eventsSent).toBe(1);
  });

  it('recovers through an HTTP half-open probe after the cooldown', async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return calls <= 2 ? { ok: false, status: 503 } : { ok: true, status: 200 };
      });
      const sink = new HttpSink({
        endpoint: 'https://ingest.example.test/events',
        fetchImpl,
        batchSize: 1,
        circuitBreaker: { failureThreshold: 2, cooldownMs: 100 },
      });
      const client = new AnalyticsClient(
        {
          flushIntervalMs: 0,
          circuitFailureThreshold: 2,
          circuitCooldownMs: 100,
        },
        sink,
      );

      client.track('http_failure_1');
      await client.flush();
      client.track('http_failure_2');
      await client.flush();
      expect(client.getCircuitState()).toBe('open');

      client.track('suppressed');
      await client.flush();
      expect(calls).toBe(2);

      await vi.advanceTimersByTimeAsync(100);
      client.track('http_recovery');
      await client.flush();

      expect(calls).toBe(3);
      expect(client.getCircuitState()).toBe('closed');
      expect(client.getMetrics().eventsSent).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
