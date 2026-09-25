/**
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
