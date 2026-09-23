import { describe, expect, it } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import type { Emitter } from '../src/emitter/index.js';
import { vi } from 'vitest';

describe('track() → EventQueue routing', () => {
  it('queue is empty before any track() call', () => {
    const client = new AnalyticsClient();
    expect(client.getQueue().size).toBe(0);
  });

  it('track() enqueues exactly one event', () => {
    const client = new AnalyticsClient();
    client.track('page_view');
    expect(client.getQueue().size).toBe(1);
  });

  it('queue.size increments with each track() call', () => {
    const client = new AnalyticsClient();
    client.track('event_one');
    expect(client.getQueue().size).toBe(1);
    client.track('event_two');
    expect(client.getQueue().size).toBe(2);
    client.track('event_three');
    expect(client.getQueue().size).toBe(3);
  });

  it('queued event has correct name', () => {
    const client = new AnalyticsClient();
    client.track('button_click');
    const [event] = client.getQueue().drain();
    expect(event?.name).toBe('button_click');
  });

  it('queued event has correct properties', () => {
    const client = new AnalyticsClient();
    client.track('purchase', { amount: 99, currency: 'USD' });
    const [event] = client.getQueue().drain();
    expect(event?.properties).toEqual({ amount: 99, currency: 'USD' });
  });

  it('drain() after track() returns the enqueued event and clears queue', () => {
    const client = new AnalyticsClient();
    client.track('drain_test');
    const events = client.getQueue().drain();
    expect(events).toHaveLength(1);
    expect(client.getQueue().size).toBe(0);
  });

  it('track() does NOT call emitter.send() directly (queued, not forwarded)', () => {
    const sendFn = vi.fn();
    const emitter: Emitter = { send: sendFn };
    const client = new AnalyticsClient(undefined, emitter);
    client.track('queued_event');
    // emitter.send should NOT be called — events are queued, flushed later
    expect(sendFn).not.toHaveBeenCalled();
  });

  it('multiple track() calls are all preserved in queue before drain', () => {
    const client = new AnalyticsClient();
    const names = ['evt_a', 'evt_b', 'evt_c'];
    names.forEach((n) => client.track(n));
    const events = client.getQueue().drain();
    expect(events.map((e) => e.name)).toEqual(names);
  });

  it('failed track() (invalid name) does not enqueue anything', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('')).toThrow();
    expect(client.getQueue().size).toBe(0);
  });

  it('each client has an independent queue', () => {
    const c1 = new AnalyticsClient();
    const c2 = new AnalyticsClient();
    c1.track('only_in_c1');
    expect(c1.getQueue().size).toBe(1);
    expect(c2.getQueue().size).toBe(0);
  });
});
