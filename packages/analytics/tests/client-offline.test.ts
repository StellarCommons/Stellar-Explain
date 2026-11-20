import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnalyticsClient } from '../src/client';
import type { Emitter } from '../src/emitter/index';
import type { AnalyticsEvent } from '../src/types';
import { HttpSink } from '../src/sinks/HttpSink';

class RecordingEmitter implements Emitter {
  sent: AnalyticsEvent[] = [];
  send(event: AnalyticsEvent): void {
    this.sent.push(event);
  }
}

function mockWindowWithConnectivity() {
  const listeners: Record<string, (() => void)[]> = { online: [], offline: [] };
  vi.stubGlobal('window', {
    addEventListener: (type: string, handler: () => void) => {
      listeners[type]?.push(handler);
    },
    removeEventListener: (type: string, handler: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
    },
  });
  return {
    fireOffline: () => listeners.offline.forEach((h) => h()),
    fireOnline: () => listeners.online.forEach((h) => h()),
  };
}

describe('AnalyticsClient offline handling (#84)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pauses flush() while offline and resumes on reconnect', async () => {
    const { fireOffline, fireOnline } = mockWindowWithConnectivity();
    const emitter = new RecordingEmitter();
    const client = new AnalyticsClient({}, emitter);

    fireOffline();
    client.track('page_view');
    await client.flush();

    expect(emitter.sent).toHaveLength(0);
    expect(client.getQueue().size).toBe(1);

    fireOnline();
    // the 'online' handler triggers flush() itself
    await Promise.resolve();

    expect(emitter.sent).toHaveLength(1);
    expect(client.getQueue().size).toBe(0);
  });

  it('flushes normally when never offline', async () => {
    const emitter = new RecordingEmitter();
    const client = new AnalyticsClient({}, emitter);

    client.track('page_view');
    await client.flush();

    expect(emitter.sent).toHaveLength(1);
  });
});

describe('AnalyticsClient.getCircuitState() (#82)', () => {
  it('returns undefined for emitters without a circuit breaker', () => {
    const client = new AnalyticsClient({}, new RecordingEmitter());
    expect(client.getCircuitState()).toBeUndefined();
  });

  it('delegates to an HttpSink emitter\'s circuit state', () => {
    const sink = new HttpSink({ endpoint: 'https://example.com/ingest' });
    const client = new AnalyticsClient({}, sink);
    expect(client.getCircuitState()).toBe('closed');
  });
});
