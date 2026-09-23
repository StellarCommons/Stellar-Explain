/**
 * SSR-safe runtime environment detection.
 *
 * All checks use `typeof` guards so importing or calling this module never
 * throws when `window` (or `process`) is undefined, e.g. during server-side
 * rendering or in edge runtimes.
 */

export type RuntimeEnvironment = 'browser' | 'node' | 'unknown';

function hasBrowserGlobals(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}

function hasNodeGlobals(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    process.versions !== null &&
    typeof (process.versions as Record<string, unknown>).node === 'string'
  );
}

/**
 * Detect the current runtime. Browser takes precedence: when both browser
 * and Node globals exist (bundled SSR hybrids), browser behavior wins.
 */
export function detectEnvironment(): RuntimeEnvironment {
  if (hasBrowserGlobals()) return 'browser';
  if (hasNodeGlobals()) return 'node';
  return 'unknown';
}

/** True when running in a browser (DOM available). */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser';
}

/** True when running under Node.js. */
export function isNode(): boolean {
  return detectEnvironment() === 'node';
}
