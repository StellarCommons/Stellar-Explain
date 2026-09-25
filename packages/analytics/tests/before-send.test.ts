import { describe, it, expect, vi } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import type { AnalyticsEvent } from '../src/types.js';
import type { Emitter } from '../src/emitter/index.js';

function makeEmitter(): Emitter & { events: AnalyticsEvent[] } {
  const events: AnalyticsEvent[] = [];
  return {
    events,
    send(event: AnalyticsEvent): void {
      events.push(event);
    },
  };
}

describe('beforeSend hook', () => {
  it('enqueues an event normally when beforeSend is not configured', async () => {
    const emitter = makeEmitter();
    const client = new AnalyticsClient(
      { endpoint: 'https://example.com/collect', flushIntervalMs: 0 },
      emitter
    );
    client.track('page_view', { path: '/home' });
    await client.flush();
    expect(emitter.events).toHaveLength(1);
    expect(emitter.events[0]!.name).toBe('page_view');
    client.destroy();
  });

  it('beforeSend can mutate an event before it is enqueued', async () => {
    const emitter = makeEmitter();
    const client = new AnalyticsClient(
      {
        endpoint: 'https://example.com/collect',
        flushIntervalMs: 0,
        beforeSend: (event: AnalyticsEvent): AnalyticsEvent => ({
          ...event,
          properties: { ...event.properties, enriched: true },
        }),
      },
      emitter
    );
    client.track('button_click', { button: 'submit' });
    await client.flush();
    expect(emitter.events).toHaveLength(1);
    expect(emitter.events[0]!.properties['enriched']).toBe(true);
    expect(emitter.events[0]!.properties['button']).toBe('submit');
    client.destroy();
  });

  it('beforeSend returning null cancels the event (not enqueued)', async () => {
    const emitter = makeEmitter();
    const client = new AnalyticsClient(
      {
        endpoint: 'https://example.com/collect',
        flushIntervalMs: 0,
        beforeSend: (_event: AnalyticsEvent): null => null,
      },
      emitter
    );
    client.track('sensitive_event', { userId: 'abc123' });
    await client.flush();
    expect(emitter.events).toHaveLength(0);
    client.destroy();
  });

  it('beforeSend can cancel some events while passing others through', async () => {
    const emitter = makeEmitter();
    const client = new AnalyticsClient(
      {
        endpoint: 'https://example.com/collect',
        flushIntervalMs: 0,
        beforeSend: (event: AnalyticsEvent): AnalyticsEvent | null => {
          if (event.name === 'blocked') return null;
          return event;
        },
      },
      emitter
    );
    client.track('allowed', { x: 1 });
    client.track('blocked', { x: 2 });
    client.track('allowed', { x: 3 }); // different properties, not a duplicate
    await client.flush();
    expect(emitter.events).toHaveLength(2);
    expect(emitter.events[0]!.name).toBe('allowed');
    expect(emitter.events[1]!.name).toBe('allowed');
    client.destroy();
  });

  it('beforeSend receives the event after payload limiting', async () => {
    const emitter = makeEmitter();
    let capturedEvent: AnalyticsEvent | null = null;
    const client = new AnalyticsClient(
      {
        endpoint: 'https://example.com/collect',
        flushIntervalMs: 0,
        maxPropertyBytes: 10,
        beforeSend: (event: AnalyticsEvent): AnalyticsEvent => {
          capturedEvent = event;
          return event;
        },
      },
      emitter
    );
    // This value is large enough to be truncated by limitPayload
    client.track('test', { data: 'x'.repeat(100) });
    await client.flush();
    // beforeSend should have received the already-limited event
    expect(capturedEvent).not.toBeNull();
    expect(typeof (capturedEvent as unknown as AnalyticsEvent).properties['data']).toBe('string');
    expect(((capturedEvent as unknown as AnalyticsEvent).properties['data'] as string).length).toBe(10);
    client.destroy();
  });
});
