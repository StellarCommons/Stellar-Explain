import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsClient, RateLimiter } from '../src/index.js';

describe('#93 RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to the configured number of events per second', () => {
    const limiter = new RateLimiter(5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow()).toBe(true);
    }
  });

  it('drops events beyond the per-second budget', () => {
    const limiter = new RateLimiter(3);
    limiter.allow();
    limiter.allow();
    limiter.allow();
    expect(limiter.allow()).toBe(false);
  });

  it('refills tokens as time passes', () => {
    const limiter = new RateLimiter(2);
    limiter.allow();
    limiter.allow();
    expect(limiter.allow()).toBe(false);

    vi.advanceTimersByTime(1500);
    expect(limiter.allow()).toBe(true);
  });

  it('never exceeds capacity on refill', () => {
    const limiter = new RateLimiter(4);
    vi.advanceTimersByTime(60_000);
    for (let i = 0; i < 4; i++) {
      expect(limiter.allow()).toBe(true);
    }
    expect(limiter.allow()).toBe(false);
  });

  it('reset() restores the full budget', () => {
    const limiter = new RateLimiter(2);
    limiter.allow();
    limiter.allow();
    expect(limiter.allow()).toBe(false);
    limiter.reset();
    expect(limiter.allow()).toBe(true);
  });
});

describe('#93 client rate limiting wiring', () => {
  it('default budget of 100 events/second holds 100 queued events', () => {
    const client = new AnalyticsClient({});
    for (let i = 0; i < 100; i++) {
      client.track(`event_${i}`);
    }
    expect(client.getQueue().size).toBe(100);
  });

  it('drops over-budget events and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn');

    const client = new AnalyticsClient({ maxEventsPerSecond: 2, debug: true }, {
      send: () => undefined,
    });

    client.track('a');
    client.track('b');
    client.track('c'); // over budget — dropped + warned

    expect(client.getQueue().size).toBe(2);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[analytics]'),
      expect.stringContaining('dropped event "c"'),
    );
    warnSpy.mockRestore();
  });

  it('respects a custom maxEventsPerSecond', () => {
    const client = new AnalyticsClient({ maxEventsPerSecond: 5 });
    for (let i = 0; i < 5; i++) {
      client.track(`e${i}`);
    }
    client.track('overflow');
    expect(client.getQueue().size).toBe(5);
  });
});