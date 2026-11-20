/**
 * Validates that every value inside `properties` is serializable to JSON.
 *
 * Throws a `TypeError` if:
 * - Any top-level value is a `function`, or
 * - `JSON.stringify` throws (e.g. circular references).
 *
 * Note that the event *name* is deliberately not validated here. Callers
 * validate the name in `AnalyticsClient.track()`, where it is available;
 * keeping it out of this function is what lets `properties` be passed straight
 * through from callers that never handle a name (plugins, middleware, tests).
 *
 * @param props - The properties object attached to an analytics event.
 * @throws {TypeError} When non-serializable values are detected.
 */
export function validateProperties(props: Record<string, unknown>): void {
  // Fast path: reject any explicit function values before trying JSON.stringify.
  // A function serializes to `undefined` rather than throwing, so this is the
  // only check that catches it — the try/catch below would pass it silently and
  // the property would vanish from the event instead of raising.
  for (const value of Object.values(props)) {
    if (typeof value === 'function') {
      throw new TypeError('Properties contain non-serializable values');
    }
  }

  // Catch circular references and any other JSON.stringify-level failure.
  try {
    JSON.stringify(props);
  } catch {
    throw new TypeError('Properties contain non-serializable values');
  }
}