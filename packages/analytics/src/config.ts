/**
 * Analytics #44 — Custom endpoint support (issue #933).
 *
 * Provides the default Stellar Explain stats endpoint and a helper for
 * resolving the effective endpoint from client config.
 */

/** Default endpoint that receives batched analytics events. */
export const DEFAULT_ANALYTICS_ENDPOINT =
  "https://stellar-explain-core.onrender.com/analytics/events";

/**
 * Resolve the effective HTTP endpoint for event delivery.
 *
 * - When `configEndpoint` is provided it is used as-is.
 * - Otherwise the {@link DEFAULT_ANALYTICS_ENDPOINT} is returned.
 * - Passing an empty string is treated as "no endpoint" and returns `undefined`.
 */
export function resolveEndpoint(configEndpoint?: string): string | undefined {
  if (configEndpoint === "") return undefined;
  return configEndpoint ?? DEFAULT_ANALYTICS_ENDPOINT;
}
