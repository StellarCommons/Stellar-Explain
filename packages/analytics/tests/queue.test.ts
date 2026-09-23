import { describe, expect, it, beforeEach } from 'vitest';
import { EventQueue } from '../src/queue.js';
import type { AnalyticsEvent } from '../src/types.js';

function makeEvent(name: string): AnalyticsEvent {
  return { name, timestamp: Date.now(), properties: {} };
}

describe('EventQueue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    queue = new EventQueue();
  });

  it('starts empty', () => {
    expect(queue.size).toBe(0);
  });

  it('enqueue() increases size by 1', () => {
    queue.enqueue(makeEvent('a'));
    expect(queue.size).toBe(1);
  });

  it('enqueue() increases size for each event', () => {
    queue.enqueue(makeEvent('a'));
    queue.enqueue(makeEvent('b'));
    queue.enqueue(makeEvent('c'));
    expect(queue.size).toBe(3);
  });

  it('drain() returns all enqueued events', () => {
    const e1 = makeEvent('first');
    const e2 = makeEvent('second');
    queue.enqueue(e1);
    queue.enqueue(e2);
    const result = queue.drain();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(e1);
    expect(result[1]).toEqual(e2);
  });

  it('drain() clears the queue (size becomes 0)', () => {
    queue.enqueue(makeEvent('x'));
    queue.drain();
    expect(queue.size).toBe(0);
  });

  it('drain() on empty queue returns []', () => {
    expect(queue.drain()).toEqual([]);
  });

  it('drain() called twice: second call returns []', () => {
    queue.enqueue(makeEvent('once'));
    queue.drain();
    expect(queue.drain()).toEqual([]);
  });

  it('preserves insertion order', () => {
    const names = ['alpha', 'beta', 'gamma'];
    names.forEach((n) => queue.enqueue(makeEvent(n)));
    const drained = queue.drain();
    expect(drained.map((e) => e.name)).toEqual(names);
  });

  it('size reflects remaining events after partial drain simulation', () => {
    queue.enqueue(makeEvent('one'));
    queue.enqueue(makeEvent('two'));
    expect(queue.size).toBe(2);
    queue.drain();
    queue.enqueue(makeEvent('three'));
    expect(queue.size).toBe(1);
  });

  it('stores event properties correctly', () => {
    const evt = makeEvent('rich');
    evt.properties = { userId: 'u1', count: 5 };
    queue.enqueue(evt);
    const [result] = queue.drain();
    expect(result?.properties).toEqual({ userId: 'u1', count: 5 });
  });
});
