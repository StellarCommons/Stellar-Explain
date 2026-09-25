import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventDeduplicator } from '../src/dedup.js';
import type { AnalyticsEvent } from '../src/types.js';

function makeEvent(name: string, properties: Record<string, unknown> = {}, timestamp?: number): AnalyticsEvent {
  return { name, properties, timestamp: timestamp ?? 1000 };
}

describe('EventDeduplicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for the first occurrence of an event', () => {
    const dedup = new EventDeduplicator(500);
    const event = makeEvent('click', { button: 'submit' });
    expect(dedup.isDuplicate(event)).toBe(false);
  });

  it('returns true for an identical event seen within the window', () => {
    const dedup = new EventDeduplicator(500);
    const event = makeEvent('click', { button: 'submit' });
    dedup.isDuplicate(event); // first call — registers it
    expect(dedup.isDuplicate(event)).toBe(true);
  });

  it('returns false for an event with a different name', () => {
    const dedup = new EventDeduplicator(500);
    const event1 = makeEvent('click', { button: 'submit' });
    const event2 = makeEvent('hover', { button: 'submit' });
    dedup.isDuplicate(event1);
    expect(dedup.isDuplicate(event2)).toBe(false);
  });

  it('returns false for an event with different properties', () => {
    const dedup = new EventDeduplicator(500);
    const event1 = makeEvent('click', { button: 'submit' });
    const event2 = makeEvent('click', { button: 'cancel' });
    dedup.isDuplicate(event1);
    expect(dedup.isDuplicate(event2)).toBe(false);
  });

  it('returns false for an event with a different timestamp', () => {
    const dedup = new EventDeduplicator(500);
    const event1 = makeEvent('click', { button: 'submit' }, 1000);
    const event2 = makeEvent('click', { button: 'submit' }, 2000);
    dedup.isDuplicate(event1);
    expect(dedup.isDuplicate(event2)).toBe(false);
  });

  it('returns false for the same event after the window has expired', () => {
    const dedup = new EventDeduplicator(500);
    const event = makeEvent('click', { button: 'submit' });
    dedup.isDuplicate(event); // register

    // Advance time past the dedup window
    vi.advanceTimersByTime(600);

    expect(dedup.isDuplicate(event)).toBe(false);
  });

  it('evicts stale entries and does not treat outside-window event as duplicate', () => {
    const dedup = new EventDeduplicator(500);
    const event = makeEvent('page_view', { path: '/home' });
    dedup.isDuplicate(event);

    vi.advanceTimersByTime(501);

    // After eviction, the same event should be accepted again
    const result = dedup.isDuplicate(event);
    expect(result).toBe(false);
  });
});
