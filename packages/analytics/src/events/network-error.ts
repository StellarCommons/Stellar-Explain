import { AnalyticsEvent } from '../types.js';

/**
 * Builds a `network_error` event for a failed `fetch`/network call
 * (Analytics #67 — extends #66's error capture).
 *
 * The analytics package doesn't patch `fetch` itself; the host app calls
 * `client.trackNetworkError()` from its own fetch wrapper/interceptor when
 * a request fails, and this builds the resulting event.
 */
export function createNetworkErrorEvent(
  url: string,
  status?: number,
  message?: string
): AnalyticsEvent {
  return {
    name: 'network_error',
    timestamp: Date.now(),
    properties: {
      url,
      ...(status !== undefined ? { status } : {}),
      ...(message !== undefined ? { message } : {}),
    },
  };
}
