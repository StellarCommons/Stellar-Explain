/**
 * Validate event properties.
 * Throws a TypeError if:
 * - any value is a function
 * - the object contains a circular reference
 */
export function validateProperties(properties: Record<string, unknown>): void {
  // Check for circular references via JSON.stringify
  try {
    JSON.stringify(properties);
  } catch {
    throw new TypeError('Analytics event properties contain a circular reference.');
  }

  // Check for function values
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'function') {
      throw new TypeError(
        `Analytics event property "${key}" must not be a function.`,
      );
    }
  }
function containsFunction(value: unknown): boolean {
  if (typeof value === 'function') return true;
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (containsFunction(v)) return true;
    }
  }
  return false;
}

export function validateProperties(props: Record<string, unknown>): void {
  if (containsFunction(props)) {
    throw new TypeError('Properties contain non-serializable values');
  }
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
