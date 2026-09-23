import type { Logger } from '../lib/logger.js';

export function limitPayload(
  properties: Record<string, unknown>,
  maxBytes: number,
  logger: Logger
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
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
