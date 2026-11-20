import { describe, it, expect, vi } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import type { Emitter } from '../src/emitter/index.js';
import type { AnalyticsEvent } from '../src/types.js';

function makeMockEmitter(): Emitter & { calls: AnalyticsEvent[] } {
  const calls: AnalyticsEvent[] = [];
  return {
    calls,
    send(event: AnalyticsEvent) {
      calls.push(event);
    },
  };
}

describe('client.flush() — #1071', () => {
  it('calls emitter.send() for each queued event', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({}, emitter);

    client.track('page_view', { url: '/home' });
    client.track('button_click', { id: 'cta' });

    await client.flush();

    expect(emitter.calls).toHaveLength(2);
    expect(emitter.calls[0].name).toBe('page_view');
    expect(emitter.calls[1].name).toBe('button_click');
  });

  it('drains the queue after flush so events are not sent twice', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({}, emitter);

    client.track('once');

    await client.flush();
    expect(emitter.calls).toHaveLength(1);

    // second flush should find nothing
    await client.flush();
    expect(emitter.calls).toHaveLength(1);
  });

  it('does nothing (no throw, no calls) when the queue is empty', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({}, emitter);

    await expect(client.flush()).resolves.toBeUndefined();
    expect(emitter.calls).toHaveLength(0);
  });

  it('passes each event with correct shape to emitter.send()', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({}, emitter);

    const before = Date.now();
    client.track('identify', { userId: 'u1' });
    const after = Date.now();

    await client.flush();

    const sent = emitter.calls[0];
    expect(sent.name).toBe('identify');
    expect(sent.properties).toEqual({ userId: 'u1' });
    expect(sent.timestamp).toBeGreaterThanOrEqual(before);
    expect(sent.timestamp).toBeLessThanOrEqual(after);
  });

  it('awaits async emitters', async () => {
    const order: string[] = [];
    const asyncEmitter: Emitter = {
      async send(event) {
        await Promise.resolve();
        order.push(event.name);
      },
    };
    const client = new AnalyticsClient({}, asyncEmitter);
    client.track('a');
    client.track('b');

    await client.flush();

    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('uses the spy to confirm send is called', async () => {
    const emitter = makeMockEmitter();
    const sendSpy = vi.spyOn(emitter, 'send');

    const client = new AnalyticsClient({}, emitter);
    client.track('click');
    await client.flush();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'click' }),
    );
  });
});
