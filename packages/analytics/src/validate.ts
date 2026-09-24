function assertSerializable(value: unknown, seen: WeakSet<object>): void {
  if (value === null) return;

  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError('Properties contain non-serializable values');
    }
    return;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new TypeError('Properties contain non-serializable values');
  }

  const object = value as object;
  if (seen.has(object)) {
    throw new TypeError('Properties contain non-serializable values');
  }
  seen.add(object);

  if (Array.isArray(object)) {
    for (const item of object) assertSerializable(item, seen);
  } else {
    for (const item of Object.values(object as Record<string, unknown>)) {
      assertSerializable(item, seen);
    }
  }
  seen.delete(object);
}

/** Validate that all event properties can be represented as JSON. */
export function validateProperties(properties: Record<string, unknown>): void {
  try {
    assertSerializable(properties, new WeakSet<object>());
    JSON.stringify(properties);
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === 'Properties contain non-serializable values'
    ) {
      throw error;
    }
    throw new TypeError('Properties contain non-serializable values');
  }
}
