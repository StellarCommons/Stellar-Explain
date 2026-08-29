export interface RetryProperties {
  /** What is being retried, e.g. "tx", "account", "search". */
  type: string;
  /** The machine-readable error code that triggered the retry UI. */
  errorCode: string;
  [key: string]: unknown;
}

export interface RetryEvent {
  id: string;
  name: "retry";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: RetryProperties;
}

/**
 * Builds a `retry` event recorded when a user clicks the retry button on an
 * error state.
 *
 * @param type - What is being retried.
 * @param errorCode - The error code shown on the error state.
 */
export function buildRetryEvent(type: string, errorCode: string): RetryEvent {
  return {
    id: crypto.randomUUID(),
    name: "retry",
    timestamp: new Date(),
    properties: { type, errorCode },
  };
}