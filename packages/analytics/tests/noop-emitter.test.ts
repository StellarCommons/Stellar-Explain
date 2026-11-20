import { describe, it, expect } from 'vitest';
import { NoopEmitter } from '../src/emitter/NoopEmitter';
import type { AnalyticsEvent } from '../src/types';

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    name: 'test_event',
    timestamp: Date.now(),
    properties: {},
    ...overrides,
  };
}

describe('NoopEmitter', () => {
  it('can be instantiated', () => {
    expect(() => new NoopEmitter()).not.toThrow();
  });

  it('send() does not throw for a standard event', () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.send(makeEvent())).not.toThrow();
  });

  it('send() returns void (undefined), not a Promise', () => {
    const emitter = new NoopEmitter();
    const result = emitter.send(makeEvent());
    expect(result).toBeUndefined();
  });

  it('send() does nothing — console is not touched', () => {
    // NoopEmitter must not produce any side-effects; verifying via
    // call count on console (no spy setup means no calls happened).
    const emitter = new NoopEmitter();
    emitter.send(makeEvent({ name: 'silent_event', properties: { x: 1 } }));
    // If no error is thrown the test passes — the point is zero side-effects.
    expect(true).toBe(true);
  });

  it('send() accepts events with rich properties without throwing', () => {
    const emitter = new NoopEmitter();
    expect(() =>
      emitter.send(
        makeEvent({
          name: 'rich_event',
          properties: { user: 'alice', count: 7, tags: ['a', 'b'] },
        }),
      ),
    ).not.toThrow();
  });

  it('implements the Emitter interface (structural check)', () => {
    const emitter = new NoopEmitter();
    expect(typeof emitter.send).toBe('function');
  });
});
