/**
 * Locale detection.
 *
 * Reads the user's preferred language from `navigator.language` so it can
 * be attached to every event. Defensive: never throws and returns
 * `undefined` outside a browser (Node/SSR) or when the API is unavailable.
 */

/**
 * Returns the user's preferred language/locale (e.g. "en-US"), or
 * `undefined` when it cannot be determined.
 */
export function getLocale(): string | undefined {
  if (typeof navigator === "undefined" || typeof navigator.language !== "string") {
    return undefined;
  }
  return navigator.language || undefined;
}
