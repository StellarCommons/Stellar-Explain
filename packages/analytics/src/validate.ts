/**
 * Validates that every value inside `props` is serializable to JSON.
 *
 * Throws a `TypeError` if:
 * - Any top-level value is a `function`, or
 * - `JSON.stringify` throws (e.g. circular references).
 *
 * @param props - The properties object attached to an analytics event.
 * @throws {TypeError} When non-serializable values are detected.
 */
export function validateProperties(props: Record<string, unknown>): void {
  // Fast path: reject any explicit function values before trying JSON.stringify.
  for (const value of Object.values(props)) {
    if (typeof value === 'function') {
      throw new TypeError('Properties contain non-serializable values');
    }
  }

  // Catch circular references and any other JSON.stringify-level failures.
  try {
    JSON.stringify(props);
  } catch {
    throw new TypeError('Properties contain non-serializable values');
  }
}