/**
 * @fileoverview SSR-safe environment detection helpers.
 *
 * These utilities detect the runtime context (browser vs. Node.js/SSR) without
 * throwing a `ReferenceError` when `window` is not in scope — a common hazard
 * when analytics code is server-side rendered or run in a test environment.
 */

/**
 * Returns `true` when the code is running inside a browser context where the
 * global `window` object is available.
 *
 * Safe to call in SSR/Node contexts: uses `typeof` to avoid a
 * `ReferenceError` if `window` is not defined.
 *
 * @returns `true` in browser environments, `false` elsewhere.
 *
 * @example
 * ```ts
 * if (isBrowser()) {
 *   console.log('User agent:', window.navigator.userAgent);
 * }
 * ```
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Returns `true` when the code is running in a Node.js (or compatible)
 * environment where the global `process` object exposes `versions.node`.
 *
 * @returns `true` in Node.js environments, `false` elsewhere.
 *
 * @example
 * ```ts
 * if (isNode()) {
 *   console.log('Node version:', process.versions.node);
 * }
 * ```
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}
