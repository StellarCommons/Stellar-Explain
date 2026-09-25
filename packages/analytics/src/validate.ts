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
    throw new TypeError('Properties contain a circular reference');
  }
}
