/**
 * Opt-out checks for the analytics pipeline.
 *
 * Every check here is defensive: it never throws and defaults to "tracking
 * enabled" when the underlying browser API is unavailable (Node/SSR, or an
 * environment where `localStorage`/`navigator` don't exist).
 */

/** The localStorage key that, when present, disables all tracking. */
export const OPT_OUT_STORAGE_KEY = "stellar-explain-analytics-optout";

/**
 * True when the user has opted out via the `stellar-explain-analytics-optout`
 * localStorage flag.
 *
 * Any presence of the key disables tracking, regardless of its value
 * (including the empty string) -- consistent with the issue's "if present"
 * wording. Reading `localStorage` can throw in some environments (e.g.
 * private browsing in older Safari, or when storage is disabled by policy);
 * that's treated the same as "not opted out" rather than surfacing an error.
 */
export function isOptedOutViaLocalStorage(): boolean {
  if (typeof localStorage === "undefined") return false;

  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * True when the browser is sending a Do Not Track signal
 * (`navigator.doNotTrack === "1"`).
 *
 * Older browsers/polyfills have used other truthy representations
 * ("yes", `window.doNotTrack === "1"`); this checks the modern
 * `navigator.doNotTrack` value only, per the issue's spec.
 */
export function isOptedOutViaDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
}

/**
 * True when tracking should be disabled for any reason: an explicit
 * localStorage opt-out, or a Do Not Track signal.
 *
 * @param ignoreDnt - When `true`, the Do Not Track signal is not consulted
 * (the localStorage flag is still honored). Mirrors
 * `AnalyticsClientConfig.ignoreDnt`.
 */
export function isOptedOut(ignoreDnt = false): boolean {
  if (isOptedOutViaLocalStorage()) return true;
  if (!ignoreDnt && isOptedOutViaDoNotTrack()) return true;
  return false;
}
