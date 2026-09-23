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
}
