/** Fires `error.api` for upstream failures worth alerting on (5xx, 429). */
export function apiError(endpoint: string, statusCode: number): void {
  // eslint-disable-next-line no-console
  console.debug("error.api", { endpoint, statusCode });
}

/** True for status codes that should be tracked as `error.api` (not 404s). */
export function isTrackableApiError(statusCode: number): boolean {
  return statusCode >= 500 || statusCode === 429;
}
