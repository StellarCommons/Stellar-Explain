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
  }
}
