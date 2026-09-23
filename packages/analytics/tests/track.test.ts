import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsClient } from '../src/client';
import { resolveConfig } from '../src/config';

function makeClient() {
  return new AnalyticsClient(resolveConfig({}));
}

describe('AnalyticsClient.track()', () => {
  let client: AnalyticsClient;

  beforeEach(() => {
    client = makeClient();
  });

  // ── invalid name ─────────────────────────────────────────────────────────────

  it('throws TypeError when name is an empty string', () => {
    expect(() => client.track('')).toThrow(TypeError);
    expect(() => client.track('')).toThrow('Event name must be a non-empty string');
  });

  it('throws TypeError when name is a whitespace-only string', () => {
    expect(() => client.track('   ')).toThrow(TypeError);
  });

  it('throws TypeError when name is not a string (number)', () => {
    // @ts-expect-error intentional runtime check
    expect(() => client.track(42)).toThrow(TypeError);
  });

  it('throws TypeError when name is not a string (null)', () => {
    // @ts-expect-error intentional runtime check
    expect(() => client.track(null)).toThrow(TypeError);
  });

  it('throws TypeError when name is not a string (undefined)', () => {
    // @ts-expect-error intentional runtime check
    expect(() => client.track(undefined)).toThrow(TypeError);
  });

  // ── valid track ───────────────────────────────────────────────────────────────

  it('does not throw for a valid name with no properties', () => {
    expect(() => client.track('page_view')).not.toThrow();
  });

  it('does not throw for a valid name with plain properties', () => {
    expect(() => client.track('button_click', { label: 'submit', count: 1 })).not.toThrow();
  });

  it('uses an empty object as the default properties', () => {
    // Confirm no error — properties default is satisfied
    expect(() => client.track('signup')).not.toThrow();
  });

  it('rejects properties containing a function value', () => {
    expect(() =>
      client.track('bad_event', { handler: () => {} }),
    ).toThrow(TypeError);
  });

  it('rejects properties with circular references', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj; // circular
    expect(() => client.track('circular_event', obj)).toThrow(TypeError);
  });
});
