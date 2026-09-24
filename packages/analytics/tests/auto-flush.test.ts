import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('auto-flush timer — #1072', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes automatically after flushIntervalMs', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({ flushIntervalMs: 1000 }, emitter);

    client.track('tick_event');
    expect(emitter.calls).toHaveLength(0); // not yet flushed

    // Advance timer past the interval
    await vi.advanceTimersByTimeAsync(1001);

    expect(emitter.calls).toHaveLength(1);
    expect(emitter.calls[0].name).toBe('tick_event');
  });

  it('flushes multiple times on repeated intervals', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({ flushIntervalMs: 500 }, emitter);

    client.track('first');
    await vi.advanceTimersByTimeAsync(501);
    expect(emitter.calls).toHaveLength(1);

    client.track('second');
    await vi.advanceTimersByTimeAsync(501);
    expect(emitter.calls).toHaveLength(2);
  });

  it('destroy() stops the interval — no more auto-flushes after destroy', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({ flushIntervalMs: 500 }, emitter);

    client.track('before_destroy');
    client.destroy();

    // Advance well past interval; should NOT trigger another flush
    await vi.advanceTimersByTimeAsync(2000);

    // Only the final flush from destroy() counts
    const callCount = emitter.calls.length;
    expect(callCount).toBe(1);
    expect(emitter.calls[0].name).toBe('before_destroy');
  });

  it('destroy() performs a final flush of any remaining events', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({ flushIntervalMs: 10_000 }, emitter);

    client.track('final_event');
    // Timer has not fired yet
    expect(emitter.calls).toHaveLength(0);

    client.destroy();
    // destroy() calls flush() synchronously (void — let microtasks settle)
    await Promise.resolve();

    expect(emitter.calls).toHaveLength(1);
    expect(emitter.calls[0].name).toBe('final_event');
  });

  it('does not start a timer when flushIntervalMs is 0', async () => {
    const emitter = makeMockEmitter();
    const client = new AnalyticsClient({ flushIntervalMs: 0 }, emitter);

    client.track('no_timer');
    await vi.advanceTimersByTimeAsync(99_999);

    // No auto-flush should have happened
    expect(emitter.calls).toHaveLength(0);
  });
});
