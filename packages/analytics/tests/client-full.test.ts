import { describe, expect, it } from 'vitest';
import {
  AnalyticsClient,
  AnalyticsEvent,
  AnalyticsConfig,
  EventQueue,
  Emitter,
  NoopEmitter,
  resolveConfig,
  ANALYTICS_PACKAGE_VERSION,
} from '../src/index.js';

describe('Public exports', () => {
  it('exports ANALYTICS_PACKAGE_VERSION', () => {
    expect(ANALYTICS_PACKAGE_VERSION).toBe('0.1.0');
  });

  it('exports AnalyticsClient as a constructor', () => {
    expect(typeof AnalyticsClient).toBe('function');
    expect(new AnalyticsClient()).toBeInstanceOf(AnalyticsClient);
  });

  it('exports resolveConfig as a function', () => {
    expect(typeof resolveConfig).toBe('function');
  });

  it('exports EventQueue as a constructor', () => {
    expect(typeof EventQueue).toBe('function');
    expect(new EventQueue()).toBeInstanceOf(EventQueue);
  });

  it('exports NoopEmitter as a constructor', () => {
    expect(typeof NoopEmitter).toBe('function');
    expect(new NoopEmitter()).toBeInstanceOf(NoopEmitter);
  });
});

describe('AnalyticsClient construction', () => {
  it('constructs with no arguments', () => {
    expect(() => new AnalyticsClient()).not.toThrow();
  });

  it('constructs with partial config', () => {
    expect(() => new AnalyticsClient({ debug: true })).not.toThrow();
  });

  it('constructs with full config', () => {
    const cfg: Partial<AnalyticsConfig> = {
      endpoint: 'https://example.com/collect',
      flushIntervalMs: 10000,
      maxQueueSize: 200,
      sampleRate: 0.5,
      debug: false,
    };
    expect(() => new AnalyticsClient(cfg)).not.toThrow();
  });

  it('constructs with a custom emitter', () => {
    const emitter: Emitter = { send: () => undefined };
    expect(() => new AnalyticsClient({}, emitter)).not.toThrow();
  });

  it('defaults to NoopEmitter when no emitter is provided', () => {
    const client = new AnalyticsClient();
    expect(client.getEmitter()).toBeInstanceOf(NoopEmitter);
  });
});

describe('AnalyticsClient.track() validation', () => {
  it('throws TypeError for empty string name', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('')).toThrow(TypeError);
    expect(() => client.track('')).toThrow('Event name must be a non-empty string');
  });

  it('throws TypeError for whitespace-only name', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('   ')).toThrow(TypeError);
  });

  it('throws TypeError for numeric name', () => {
    const client = new AnalyticsClient();
    // @ts-expect-error intentional wrong type
    expect(() => client.track(42)).toThrow(TypeError);
  });

  it('throws TypeError for null name', () => {
    const client = new AnalyticsClient();
    // @ts-expect-error intentional wrong type
    expect(() => client.track(null)).toThrow(TypeError);
  });

  it('throws TypeError for undefined name', () => {
    const client = new AnalyticsClient();
    // @ts-expect-error intentional wrong type
    expect(() => client.track(undefined)).toThrow(TypeError);
  });

  it('accepts a valid event name', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('page_view')).not.toThrow();
  });

  it('throws TypeError for properties containing a function', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('evt', { fn: () => 'bad' })).toThrow(TypeError);
  });

  it('throws TypeError for circular reference in properties', () => {
    const client = new AnalyticsClient();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => client.track('evt', circular)).toThrow(TypeError);
  });

  it('accepts properties with nested plain objects', () => {
    const client = new AnalyticsClient();
    expect(() => client.track('evt', { meta: { count: 1 } })).not.toThrow();
  });
});

describe('AnalyticsClient.track() creates correct event shape', () => {
  it('creates an event with the given name', () => {
    const client = new AnalyticsClient();
    client.track('button_click');
    const events = client.getQueue().drain();
    expect(events).toHaveLength(1);
    expect((events[0] as AnalyticsEvent).name).toBe('button_click');
  });

  it('creates an event with a numeric timestamp', () => {
    const before = Date.now();
    const client = new AnalyticsClient();
    client.track('ts_test');
    const after = Date.now();
    const events = client.getQueue().drain();
    expect((events[0] as AnalyticsEvent).timestamp).toBeGreaterThanOrEqual(before);
    expect((events[0] as AnalyticsEvent).timestamp).toBeLessThanOrEqual(after);
  });

  it('attaches supplied properties to the event', () => {
    const client = new AnalyticsClient();
    client.track('evt', { color: 'blue', count: 3 });
    const events = client.getQueue().drain();
    expect((events[0] as AnalyticsEvent).properties).toEqual({ color: 'blue', count: 3 });
  });

  it('defaults properties to empty object when omitted', () => {
    const client = new AnalyticsClient();
    client.track('bare_event');
    const events = client.getQueue().drain();
    expect((events[0] as AnalyticsEvent).properties).toEqual({});
  });
});
