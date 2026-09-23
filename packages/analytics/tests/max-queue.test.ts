import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import { EventQueue } from '../src/queue.js';
import { Logger } from '../src/lib/logger.js';

describe('max-queue-size cap — #1073', () => {
  describe('EventQueue directly', () => {
    it('does not drop events when maxSize is 0 (unlimited)', () => {
      const queue = new EventQueue(0);
      for (let i = 0; i < 200; i++) {
        queue.enqueue({ name: `e${i}`, timestamp: Date.now(), properties: {} });
      }
      expect(queue.size).toBe(200);
    });

    it('caps queue at maxSize by dropping oldest', () => {
      const queue = new EventQueue(3);
      queue.enqueue({ name: 'a', timestamp: 1, properties: {} });
      queue.enqueue({ name: 'b', timestamp: 2, properties: {} });
      queue.enqueue({ name: 'c', timestamp: 3, properties: {} });
      queue.enqueue({ name: 'd', timestamp: 4, properties: {} }); // should drop 'a'

      expect(queue.size).toBe(3);
      const events = queue.drain();
      expect(events.map((e) => e.name)).toEqual(['b', 'c', 'd']);
    });

    it('always keeps the newest events on overflow', () => {
      const queue = new EventQueue(2);
      ['x', 'y', 'z'].forEach((n) =>
        queue.enqueue({ name: n, timestamp: Date.now(), properties: {} }),
      );
      const events = queue.drain();
      expect(events.map((e) => e.name)).toEqual(['y', 'z']);
    });

    it('logs a warning when an event is dropped', () => {
      const logger = new Logger(false);
      const warnSpy = vi.spyOn(logger, 'warn');

      const queue = new EventQueue(2, logger);
      queue.enqueue({ name: 'first', timestamp: 1, properties: {} });
      queue.enqueue({ name: 'second', timestamp: 2, properties: {} });
      queue.enqueue({ name: 'third', timestamp: 3, properties: {} }); // overflow

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('first'),
      );
    });

    it('logs one warning per dropped event', () => {
      const logger = new Logger(false);
      const warnSpy = vi.spyOn(logger, 'warn');

      const queue = new EventQueue(1, logger);
      queue.enqueue({ name: 'a', timestamp: 1, properties: {} });
      queue.enqueue({ name: 'b', timestamp: 2, properties: {} }); // drops 'a'
      queue.enqueue({ name: 'c', timestamp: 3, properties: {} }); // drops 'b'

      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('via AnalyticsClient', () => {
    it('respects maxQueueSize from config', () => {
      const client = new AnalyticsClient({ maxQueueSize: 2 });
      client.track('one');
      client.track('two');
      client.track('three'); // should drop 'one'

      expect(client.getQueue().size).toBe(2);
    });

    it('oldest event is dropped from the client queue on overflow', async () => {
      const calls: string[] = [];
      const client = new AnalyticsClient(
        { maxQueueSize: 2 },
        {
          send(e) {
            calls.push(e.name);
          },
        },
      );
      client.track('alpha');
      client.track('beta');
      client.track('gamma'); // drops 'alpha'

      await client.flush();
      expect(calls).toEqual(['beta', 'gamma']);
    });

    it('default maxQueueSize of 100 holds up to 100 events without dropping', () => {
      const client = new AnalyticsClient({});
      for (let i = 0; i < 100; i++) client.track(`event_${i}`);
      expect(client.getQueue().size).toBe(100);
    });
  });
});
