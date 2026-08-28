/**
 * Opt-out checks for the analytics pipeline.
 *
 * Every check here is defensive: it never throws and defaults to "tracking
 * enabled" when the underlying browser API is unavailable (Node/SSR, or an
 * environment where `localStorage` doesn't exist).
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
