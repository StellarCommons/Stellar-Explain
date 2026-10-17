/**
 * Returns true when running inside a browser environment (SSR-safe).
 *
 * Both checks are required: a worker runtime (service worker, Cloudflare
 * Worker) has `self` but not `window`, and some server environments polyfill
 * `navigator` without providing `window`. Testing `window` alone is the more
 * common implementation but is not sufficient on its own.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * Returns true when running under Node.js (SSR-safe).
 *
 * Probes `process.versions.node` rather than the mere existence of `process`,
 * because bundlers (webpack, Vite, esbuild) frequently inject a browser shim
 * for `process` that has no `versions` property. Checking the version string
 * distinguishes a real Node runtime from a browser bundle that merely *looks*
 * like it has `process`.
 *
 * In a browser this returns false, and under jsdom — which provides neither
 * `window` nor a Node `process` — it returns true only when the test runner is
 * running in a real Node process.
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' && typeof process.versions?.node === 'string'
  );
}