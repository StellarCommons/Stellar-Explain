import { describe, expectTypeOf, it } from 'vitest';
import type { AnalyticsEvent } from '../src/types.js';

describe('AnalyticsEvent', () => {
  it('has the expected field types', () => {
    expectTypeOf<AnalyticsEvent['name']>().toEqualTypeOf<string>();
    expectTypeOf<AnalyticsEvent['timestamp']>().toEqualTypeOf<number>();
    expectTypeOf<AnalyticsEvent['properties']>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('requires name, timestamp and properties', () => {
    expectTypeOf({ name: 'x', timestamp: 0, properties: {} }).toMatchTypeOf<AnalyticsEvent>();
    expectTypeOf({ name: 'x' }).not.toMatchTypeOf<AnalyticsEvent>();
  });
});
