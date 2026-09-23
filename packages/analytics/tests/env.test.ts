import { afterEach, describe, expect, it } from 'vitest';
import { detectEnvironment, isBrowser, isNode } from '../src/env';

afterEach(() => {
  // Always restore a clean global scope — leaked stubs would pollute
  // other suites running in the same worker.
  delete (globalThis as Record<string, unknown>).window;
});

describe('detectEnvironment', () => {
  it('detects Node in the test runner without throwing', () => {
    expect(() => detectEnvironment()).not.toThrow();
    expect(detectEnvironment()).toBe('node');
  });

  it('does not throw when window is undefined (SSR)', () => {
    expect(typeof window).toBe('undefined');
    expect(() => detectEnvironment()).not.toThrow();
    expect(isBrowser()).toBe(false);
  });

  it('detects a browser when window.document exists', () => {
    (globalThis as Record<string, unknown>).window = { document: {} };
    expect(detectEnvironment()).toBe('browser');
    expect(isBrowser()).toBe(true);
    expect(isNode()).toBe(false);
  });

  it('ignores a window stub without document', () => {
    (globalThis as Record<string, unknown>).window = {};
    expect(detectEnvironment()).toBe('node');
    expect(isBrowser()).toBe(false);
  });

  it('prefers browser when both browser and Node globals exist', () => {
    (globalThis as Record<string, unknown>).window = { document: {} };
    expect(detectEnvironment()).toBe('browser');
  });
});

describe('isNode', () => {
  it('is true under Node.js', () => {
    expect(isNode()).toBe(true);
  });
});
