import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsClient, HttpSink } from '../src/index.js';
import { persistPendingQueue, clearPersistedQueue } from '../src/index.js';
import type { AnalyticsEvent } from '../src/types.js';

/**
 * #95 — end-to-end outage integration test.
 *
 * Exercises the full offline→dead-letter→recovery path: an HttpSink backed
 * by a network that drops, the client circuit breaker opening, events being
 * routed to the dead-letter, and — after the outage window — the circuit
 * closing again and traffic flowing. Persistence across an "unload"
 * boundary is covered as well.
 */

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as Storage;
}

let beforeUnloadHandler: (() => void) | null = null;

function stubBrowser(storage: Storage): void {
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'beforeunload') beforeUnloadHandler = fn;
    },
    removeEventListener: (type: string) => {
      if (type === 'beforeunload') beforeUnloadHandler = null;
    },
  });
}

function outagedFetch(failsFirstN: number): ReturnType<typeof vi.fn> {
  let calls = 0;
  return vi.fn().mockImplementation(() => {
    calls += 1;
    if (calls <= failsFirstN) {
      return Promise.reject(new Error('network error'));
    }
    return Promise.resolve({ ok: true, status: 200 });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  beforeUnloadHandler = null;
  vi.unstubAllGlobals();
});

describe('#95 outage → dead-letter → recovery', () => {
  it('routes failed sends to the dead-letter and never throws', async () => {
    vi.stubGlobal('fetch', outagedFetch(3));
    const client = new AnalyticsClient(
      { maxEventsPerSecond: 50 },
      new HttpSink({ endpoint: 'https://ingest.example/x' }),
    );

    client.track('one');
    client.track('two');
    client.track('three');
    await client.flush();

    // All three failed during the outage → dead-letter, no exception.
    expect(client.getDeadLetter().size).toBe(3);
  });

  it('opens the circuit during an outage and recovers after the window', async () => {
    const fetchMock = outagedFetch(3); // calls 1..3 fail, then succeed
    vi.stubGlobal('fetch', fetchMock);
    const client = new AnalyticsClient(
      { maxEventsPerSecond: 50 },
      new HttpSink({ endpoint: 'https://ingest.example/x' }),
    );

    client.track('a');
    client.track('b');
    client.track('c');
    await client.flush();

    expect(client.getCircuitBreaker().getState()).toBe('open');
    expect(client.getDeadLetter().size).toBe(3);

    // Outage window cools down → half-open trial succeeds → closed again.
    vi.advanceTimersByTime(11_000);
    client.track('recovered');
    await client.flush();

    expect(client.getCircuitBreaker().getState()).toBe('closed');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(client.getDeadLetter().drain().map((e) => e.name)).toEqual(['a', 'b', 'c']);
  });
});

describe('#95 offline persistence across an unload boundary', () => {
  it('persists pending events and restores them on the next construction', async () => {
    const storage = createFakeStorage();
    stubBrowser(storage);

    const clientA = new AnalyticsClient(
      { maxEventsPerSecond: 50 },
      new HttpSink({ endpoint: 'https://ingest.example/x', useBeacon: true }),
    );
    clientA.track('offline_one');
    clientA.track('offline_two');

    // Simulate page unload: persist the pending queue.
    expect(persistPendingQueue(clientA.getQueue().peek())).toBe(true);
    const persisted = JSON.parse(storage.getItem('stellar_analytics_pending_queue')!) as AnalyticsEvent[];
    expect(persisted.map((e) => e.name)).toEqual(['offline_one', 'offline_two']);

    // Simulate a fresh page: network is healthy again.
    const sent: AnalyticsEvent[] = [];
    const clientB = new AnalyticsClient(
      { maxEventsPerSecond: 50 },
      { send: (e: AnalyticsEvent) => sent.push(e) },
    );

    // Restored in the constructor and flushed.
    await vi.advanceTimersByTimeAsync(0);
    expect(sent.map((e) => e.name)).toEqual(['offline_one', 'offline_two']);
    expect(storage.getItem('stellar_analytics_pending_queue')).toBeNull();
  });

  it('clears stale persisted data between runs', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    clearPersistedQueue();
    expect(storage.getItem('stellar_analytics_pending_queue')).toBeNull();
  });
});