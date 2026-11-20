import { describe, it, expect } from 'vitest';
import { validateProperties } from '../src/validate';

describe('validateProperties()', () => {
  // ── valid inputs ──────────────────────────────────────────────────────────────

  it('accepts an empty object', () => {
    expect(() => validateProperties({})).not.toThrow();
  });

  it('accepts a flat object with string values', () => {
    expect(() => validateProperties({ page: '/home', user: 'alice' })).not.toThrow();
  });

  it('accepts a flat object with number and boolean values', () => {
    expect(() => validateProperties({ count: 5, active: true })).not.toThrow();
  });

  it('accepts nested plain objects', () => {
    expect(() =>
      validateProperties({ meta: { source: 'organic', score: 0.9 } }),
    ).not.toThrow();
  });

  it('accepts arrays of primitives', () => {
    expect(() => validateProperties({ tags: ['a', 'b', 'c'] })).not.toThrow();
  });

  it('accepts null values', () => {
    expect(() => validateProperties({ opt: null })).not.toThrow();
  });

  // ── function values ───────────────────────────────────────────────────────────

  it('throws TypeError when a value is a function', () => {
    expect(() =>
      validateProperties({ handler: () => {} }),
    ).toThrow(TypeError);
  });

  it('throws with the correct message for function values', () => {
    expect(() =>
      validateProperties({ fn: function noop() {} }),
    ).toThrow('Properties contain non-serializable values');
  });

  it('throws TypeError for arrow function values', () => {
    expect(() =>
      validateProperties({ cb: () => 'x' }),
    ).toThrow(TypeError);
  });

  // ── circular references ───────────────────────────────────────────────────────

  it('throws TypeError when props contains a circular reference', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => validateProperties(obj)).toThrow(TypeError);
  });

  it('throws with the correct message for circular references', () => {
    const obj: Record<string, unknown> = {};
    obj['loop'] = obj;
    expect(() => validateProperties(obj)).toThrow('Properties contain non-serializable values');
  });

  it('throws for deeply nested circular references', () => {
    const child: Record<string, unknown> = {};
    const parent: Record<string, unknown> = { child };
    child['parent'] = parent; // circular through nesting
    expect(() => validateProperties(parent)).toThrow(TypeError);
  });
});
