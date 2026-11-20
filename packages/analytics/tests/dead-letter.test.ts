import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient } from '../src/index.js';
import { DeadLetterQueue } from '../src/index.js';
import { Logger } from '../src/index.js';

describe('#91 DeadLetterQueue', () => {
  it('starts empty', () => {
    const dlq = new DeadLetterQueue();
    expect(dlq.size).toBe(0);
  });

  it('retains pushed events', () => {
    const dlq = new DeadLetterQueue(10);
    dlq.push({ name: 'a', timestamp: 0, properties: {} });
    dlq.push({ name: 'b', timestamp: 1, properties: {} });
    expect(dlq.size).toBe(2);
    expect(dlq.drain().map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('drops the oldest event when the cap is reached', () => {
    const logger = new Logger(true);
    const warnSpy = vi.spyOn(logger, 'warn');
    const dlq = new DeadLetterQueue(2, logger);

    dlq.push({ name: 'one', timestamp: 0, properties: {} });
    dlq.push({ name: 'two', timestamp: 1, properties: {} });
    dlq.push({ name: 'three', timestamp: 2, properties: {} });

    expect(dlq.size).toBe(2);
    expect(dlq.drain().map((e) => e.name)).toEqual(['two', 'three']);
    expect(warnSpy).toHaveBeenCalledWith(
      'Dead-letter cap (2) reached — dropped oldest event: "one"',
    );
  });
});

describe('#91 client dead-letter routing', () => {
  it('routes failed events to the dead-letter on flush()', async () => {
    const failingEmitter = {
      send: vi.fn().mockRejectedValue(new Error('network down')),
    };
    const client = new AnalyticsClient({}, failingEmitter);
    client.track('lost');

    await expect(client.flush()).resolves.toBeUndefined();

    const dead = client.getDeadLetter().drain();
    expect(dead).toHaveLength(1);
    expect(dead[0]?.name).toBe('lost');
  });

  it('flush() does not reject when a single emitter fails', async () => {
    const emitter = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(undefined),
    };
    const client = new AnalyticsClient({}, emitter);
    client.track('fails');
    client.track('succeeds');

    await expect(client.flush()).resolves.toBeUndefined();
    expect(emitter.send).toHaveBeenCalledTimes(2);
    expect(client.getDeadLetter().size).toBe(1);
  });

  it('drives the dead-letter through the EventQueue cap too', async () => {
    const alwaysFail = { send: vi.fn().mockRejectedValue(new Error('x')) };
    const client = new AnalyticsClient({ maxQueueSize: 2 }, alwaysFail);
    client.track('a');
    client.track('b');
    client.track('c');
    await client.flush();
    const dead = client.getDeadLetter().drain();
    expect(dead.map((e) => e.name)).toEqual(['b', 'c']);
  });
});