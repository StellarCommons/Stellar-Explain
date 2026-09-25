import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient, NoopEmitter } from '../src/index.js';
import { MultiSink } from '../src/sinks/MultiSink.js';
import type { Emitter } from '../src/emitter/index.js';
import type { AnalyticsEvent } from '../src/types.js';

describe('#97 MultiSink', () => {
  it('fans an event out to every sink', async () => {
    const a = { send: vi.fn().mockResolvedValue(undefined) };
    const b = { send: vi.fn().mockResolvedValue(undefined) };
    const sink = new MultiSink([a, b]);

    await sink.send({ name: 'evt', timestamp: 0, properties: {} });

    expect(a.send).toHaveBeenCalledTimes(1);
    expect(b.send).toHaveBeenCalledTimes(1);
  });

  it('does not reject when one sink fails', async () => {
    const broken = { send: vi.fn().mockRejectedValue(new Error('boom')) };
    const ok = { send: vi.fn().mockResolvedValue(undefined) };
    const sink = new MultiSink([broken, ok]);

    await expect(
      sink.send({ name: 'evt', timestamp: 0, properties: {} }),
    ).resolves.toBeUndefined();
    expect(ok.send).toHaveBeenCalledTimes(1);
  });
});

describe('#97 client emitter fan-out', () => {
  it('accepts a single emitter', () => {
    const client = new AnalyticsClient({}, { send: () => undefined });
    expect(client.getEmitter()).toBeTruthy();
  });

  it('accepts an array of emitters and fans out via MultiSink', async () => {
    const a = { send: vi.fn().mockResolvedValue(undefined) };
    const b = { send: vi.fn().mockResolvedValue(undefined) };
    const client = new AnalyticsClient({}, [a, b]);

    expect(client.getEmitter()).toBeInstanceOf(MultiSink);
    client.track('shared');
    await client.flush();

    expect(a.send).toHaveBeenCalledTimes(1);
    expect(b.send).toHaveBeenCalledTimes(1);
  });

  it('treats a single-element array as that emitter directly', () => {
    const single: Emitter = { send: () => undefined };
    const client = new AnalyticsClient({}, [single]);
    expect(client.getEmitter()).toBe(single);
  });

  it('defaults to NoopEmitter for an empty array', () => {
    const client = new AnalyticsClient({}, []);
    expect(client.getEmitter()).toBeInstanceOf(NoopEmitter);
  });

  it('an array with a backing emitter receives events as-is', async () => {
    const events: AnalyticsEvent[] = [];
    const client = new AnalyticsClient({}, [{ send: (e: AnalyticsEvent) => events.push(e) }]);
    client.track('x');
    await client.flush();
    expect(events).toHaveLength(1);
  });
});