/**
 * Web Performance API helpers.
 *
 * First Contentful Paint timing is read from the Performance Timeline's
 * "paint" entries, which are populated by the browser automatically. Every
 * lookup here is defensive: it never throws and returns `undefined` in
 * environments (Node/SSR, or unsupporting browsers) where the Performance
 * API is unavailable.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming
 */

/**
 * Returns the First Contentful Paint time in milliseconds, or `undefined`
 * when it has not been recorded yet or the Performance API is unavailable.
 */
export function getFirstContentfulPaintMs(): number | undefined {
  if (typeof performance === "undefined") return undefined;

  try {
    const entries = performance.getEntriesByType("paint");
    const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
    return fcp ? fcp.startTime : undefined;
  } catch {
    return undefined;
  }
}