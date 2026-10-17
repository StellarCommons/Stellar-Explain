import type { Logger } from '../lib/logger.js';

/**
 * Bounds the serialized size of each property value.
 *
 * Every value is measured by its **JSON-serialized** length, not just string
 * length: a nested object can be far larger than any of its parts, and an
 * oversized payload is what the ingest endpoint rejects (or silently truncates
 * server-side, which loses the event).
 *
 * Values within `maxBytes` are passed through **unchanged**, preserving their
 * original type. Only oversized values are replaced, and they are replaced with
 * a string (the truncated serialization) because there is no way to keep a
 * partial object. This asymmetry is why a caller reading the result cannot
 * assume uniform value types — it is inherent to truncation, not an oversight.
 */
export function limitPayload(
  properties: Record<string, unknown>,
  maxBytes: number,
  logger: Logger,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    // `JSON.stringify` returns undefined for functions, symbols and undefined,
    // so those are passed through untouched rather than compared against a
    // number. (validateProperties rejects functions earlier in the pipeline;
    // this is belt-and-braces for direct callers.)
    const serialized = JSON.stringify(value);

    if (serialized !== undefined && serialized.length > maxBytes) {
      logger.warn(`Property "${key}" exceeds ${maxBytes} bytes, truncating`);
      result[key] = serialized.slice(0, maxBytes);
    } else {
      result[key] = value;
    }
  }

  return result;
}