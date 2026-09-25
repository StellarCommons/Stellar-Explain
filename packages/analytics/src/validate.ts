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
 * Validates event properties.
 * Throws TypeError when the event name is empty.
 */
export function validateProperties(name: string, properties: Record<string, unknown>): void {
  if (!name || name.trim().length === 0) {
    throw new TypeError('Event name must not be empty.');
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new TypeError('Event properties must be a plain object.');
export function validateProperties(properties: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'function') {
      throw new TypeError(`Property "${key}" must not be a function`);
    }
  }
  // Check for circular references
  try {
    JSON.stringify(properties);
  } catch {
    throw new TypeError('Properties contain circular references');
    throw new TypeError('Properties contain a circular reference');
  }
}
