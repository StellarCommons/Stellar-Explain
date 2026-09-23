import { Logger } from '../lib/logger.js';

/**
 * Truncates string property values that exceed maxBytes.
 * Non-string values are passed through unchanged.
 */
export function limitPayload(
  properties: Record<string, unknown>,
  maxBytes: number,
  logger: Logger,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && value.length > maxBytes) {
      logger.warn(`Property "${key}" truncated from ${value.length} to ${maxBytes} bytes.`);
      result[key] = value.slice(0, maxBytes);
    } else {
      result[key] = value;
    }
  }
  return result;
}
