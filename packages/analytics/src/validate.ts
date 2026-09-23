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
  try {
    JSON.stringify(props);
  } catch {
    throw new TypeError('Properties contain non-serializable values');
  }
}
