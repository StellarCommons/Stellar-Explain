import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsClient } from '../../src/client.js';
import type { Emitter } from '../../src/emitter/index.js';
import type { AnalyticsEvent } from '../../src/types.js';

class FakeEmitter implements Emitter {
  public readonly received: AnalyticsEvent[] = [];
  send(event: AnalyticsEvent): void {
    this.received.push(event);
  }
}

describe('end-to-end pipeline: track → queue → flush → emitter', () => {
  it('track() enqueues and flush() delivers to emitter', async () => {
    const emitter = new FakeEmitter();
    const client = new AnalyticsClient({ endpoint: 'http://localhost', debug: false }, emitter);
    client.track('page_view', { page: '/home' });
    client.track('button_click', { id: 'cta' });
    expect(emitter.received).toHaveLength(0); // not delivered yet
    await client.flush();
    expect(emitter.received).toHaveLength(2);
    expect(emitter.received[0].name).toBe('page_view');
    expect(emitter.received[1].name).toBe('button_click');
    client.destroy();
  });

  it('track() throws on empty name', () => {
    const client = new AnalyticsClient({ endpoint: 'http://localhost' });
    expect(() => client.track('', {})).toThrow(TypeError);
    client.destroy();
  });

  it('flush() on empty queue delivers nothing to emitter', async () => {
    const emitter = new FakeEmitter();
    const client = new AnalyticsClient({ endpoint: 'http://localhost' }, emitter);
    await client.flush();
    expect(emitter.received).toHaveLength(0);
    client.destroy();
  });

  it('events after flush are queued again for next flush', async () => {
    const emitter = new FakeEmitter();
    const client = new AnalyticsClient({ endpoint: 'http://localhost' }, emitter);
    client.track('first', {});
    await client.flush();
    client.track('second', {});
    await client.flush();
    expect(emitter.received).toHaveLength(2);
    expect(emitter.received[1].name).toBe('second');
    client.destroy();
  });

  it('sampleRate=0 means no events are delivered', async () => {
    const emitter = new FakeEmitter();
    const client = new AnalyticsClient({ endpoint: 'http://localhost', sampleRate: 0 }, emitter);
    client.track('event', {});
    await client.flush();
    expect(emitter.received).toHaveLength(0);
    client.destroy();
  });

  it('beforeSend returning null cancels the event', async () => {
    const emitter = new FakeEmitter();
    const client = new AnalyticsClient(
      { endpoint: 'http://localhost', beforeSend: () => null },
      emitter
    );
    client.track('cancelled_event', {});
    await client.flush();
    expect(emitter.received).toHaveLength(0);
    client.destroy();
  });
});
