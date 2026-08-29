import { ErrorEvent } from "../../types";

/**
 * Builds an `error_occurred` event recorded for an API error or frontend
 * exception.
 *
 * @param code - Machine-readable error code, e.g. "TX_NOT_FOUND".
 * @param message - Optional human-readable message (must not contain PII).
 */
export function buildErrorEvent(code: string, message?: string): ErrorEvent {
  return {
    id: crypto.randomUUID(),
    name: "error_occurred",
    timestamp: new Date(),
    properties: {
      code,
      ...(message !== undefined ? { message } : {}),
    },
  };
}