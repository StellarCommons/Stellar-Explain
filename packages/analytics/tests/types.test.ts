import { describe, expect, it } from 'vitest';
import type { AnalyticsEvent } from '../src/types.js';

describe('AnalyticsEvent', () => {
  it('accepts a valid event with all required fields', () => {
    const event: AnalyticsEvent = {
      name: 'page_view',
      timestamp: 1700000000000,
      properties: { path: '/home' },
    };

    expect(event.name).toBe('page_view');
    expect(event.timestamp).toBe(1700000000000);
    expect(event.properties).toEqual({ path: '/home' });
  });

  it('has a name field that is a string', () => {
    const event: AnalyticsEvent = {
      name: 'button_click',
      timestamp: Date.now(),
      properties: {},
    };

    expect(typeof event.name).toBe('string');
  });

  it('has a timestamp field that is a number (epoch ms)', () => {
    const now = Date.now();
    const event: AnalyticsEvent = {
      name: 'test_event',
      timestamp: now,
      properties: {},
    };

    expect(typeof event.timestamp).toBe('number');
    expect(event.timestamp).toBe(now);
  });

  it('has a properties field that is a Record<string, unknown>', () => {
    const event: AnalyticsEvent = {
      name: 'test_event',
      timestamp: Date.now(),
      properties: {
        stringProp: 'value',
        numberProp: 42,
        boolProp: true,
        nullProp: null,
        nestedProp: { deep: 'object' },
        arrayProp: [1, 2, 3],
      },
    };

    expect(typeof event.properties).toBe('object');
    expect(event.properties['stringProp']).toBe('value');
    expect(event.properties['numberProp']).toBe(42);
    expect(event.properties['boolProp']).toBe(true);
    expect(event.properties['nullProp']).toBeNull();
  });

  it('accepts empty properties', () => {
    const event: AnalyticsEvent = {
      name: 'minimal_event',
      timestamp: 0,
      properties: {},
    };

    expect(event.properties).toEqual({});
  });
});
