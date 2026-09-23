import { describe, expect, it } from 'vitest';
import { isBrowser, isNode } from '../src/env.js';

describe('isBrowser', () => {
  it('returns a boolean', () => {
    expect(typeof isBrowser()).toBe('boolean');
  });

  it('returns false in Node.js/vitest environment (no window global)', () => {
    // Vitest runs in Node by default; window is not defined
    expect(isBrowser()).toBe(false);
  });

  it('does not throw when window is undefined', () => {
    expect(() => isBrowser()).not.toThrow();
  });
});

describe('isNode', () => {
  it('returns a boolean', () => {
    expect(typeof isNode()).toBe('boolean');
  });

  it('returns true in Node.js/vitest environment', () => {
    // Vitest runs in Node; process.versions.node is present
    expect(isNode()).toBe(true);
  });

  it('does not throw', () => {
    expect(() => isNode()).not.toThrow();
  });
});

describe('isBrowser / isNode mutual exclusivity in test environment', () => {
  it('are not both true in the vitest environment', () => {
    // In Node, at most one should be true (browser env might set both in some
    // hybrid setups, but in a clean Node test context they are mutually exclusive)
    const both = isBrowser() && isNode();
    expect(both).toBe(false);
  });
});
