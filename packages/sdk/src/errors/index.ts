import type { ApiError } from "../types/index.js";

/**
 * Thrown when a request exceeds the configured timeout or is explicitly
 * cancelled by the consumer via an {@link AbortSignal}.
 *
 * The `message` field distinguishes the two cases:
 * - `'Request timed out'`  — the internal timeout elapsed before the server responded.
 * - `'Request cancelled'`  — the caller's `AbortSignal` fired before the response arrived.
 *
 * @example
 * ```ts
 * import { StellarExplainClient, TimeoutError } from '@stellar-explain/sdk';
 *
 * const client = new StellarExplainClient({ baseUrl: 'https://api.example.com' });
 *
 * try {
 *   const tx = await client.explainTransaction(hash);
 * } catch (err) {
 *   if (err instanceof TimeoutError) {
 *     // err.message === 'Request timed out'  |  'Request cancelled'
 *     console.error('Request did not complete:', err.message);
 *   }
 * }
 * ```
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Thrown when the upstream server returns a non-JSON response body where the
 * SDK expected JSON.
 *
 * This commonly happens when a proxy or CDN returns an HTML error page instead
 * of the API's normal JSON envelope.
 */
export class UpstreamError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "UpstreamError";
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the Stellar Explain API returns a non-2xx HTTP response.
 *
 * The `code` property contains the machine-readable error code from the
 * response body (e.g. `'NOT_FOUND'`, `'BAD_REQUEST'`, `'UPSTREAM_ERROR'`),
 * suitable for programmatic branching. The inherited `message` property
 * contains the human-readable description returned by the API.
 *
 * @example
 * ```ts
 * import { StellarExplainClient, ApiRequestError } from '@stellar-explain/sdk';
 *
 * const client = new StellarExplainClient({ baseUrl: 'https://api.example.com' });
 *
 * try {
 *   const tx = await client.explainTransaction('invalid-hash');
 * } catch (err) {
 *   if (err instanceof ApiRequestError) {
 *     switch (err.code) {
 *       case 'NOT_FOUND':
 *         console.error('Transaction not found on the Stellar network.');
 *         break;
 *       case 'BAD_REQUEST':
 *         console.error('Invalid input:', err.message);
 *         break;
 *       default:
 *         console.error('API error:', err.message);
 *     }
 *   }
 * }
 * ```
 */
export class ApiRequestError extends Error {
  /**
   * Machine-readable error code returned by the API.
   *
   * Common values: `'NOT_FOUND'`, `'BAD_REQUEST'`, `'UPSTREAM_ERROR'`.
   */
  readonly code: string;

  constructor(apiError: ApiError) {
    super(apiError.error.message);
    this.name = "ApiRequestError";
    this.code = apiError.error.code;
  }
}
