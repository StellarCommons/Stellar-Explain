import type { SdkErrorCode } from "../types/index.js";

/**
 * Base class for all SDK errors.
 *
 * Every error thrown by `StellarExplainClient` extends this class, so you can
 * catch broadly with `instanceof StellarExplainError` or narrowly with the
 * specific subclass.
 *
 * @example
 * ```ts
 * import { StellarExplainError, NotFoundError } from '@stellar-explain/sdk';
 *
 * try {
 *   await client.explainTransaction(hash);
 * } catch (err) {
 *   if (err instanceof NotFoundError) {
 *     console.error('not found');
 *   } else if (err instanceof StellarExplainError) {
 *     console.error('sdk error:', err.code, err.message);
 *   }
 * }
 * ```
 */
export class StellarExplainError extends Error {
  /** Machine-readable error code. */
  readonly code: SdkErrorCode;
  /** HTTP status code, if the error originated from an HTTP response. */
  readonly statusCode?: number;

  constructor(message: string, code: SdkErrorCode, statusCode?: number) {
    super(message);
    this.name = "StellarExplainError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, StellarExplainError.prototype);
  }
}

/**
 * Thrown when the API returns HTTP 404 for a transaction or account lookup.
 *
 * @example
 * ```ts
 * if (err instanceof NotFoundError) {
 *   console.error('Resource not found');
 * }
 * ```
 */
export class NotFoundError extends StellarExplainError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when the API returns HTTP 429 Too Many Requests.
 *
 * Check `retryAfter` to know how many seconds to wait before retrying.
 *
 * @example
 * ```ts
 * if (err instanceof RateLimitError) {
 *   const wait = err.retryAfter ?? 60;
 *   await sleep(wait * 1000);
 * }
 * ```
 */
export class RateLimitError extends StellarExplainError {
  /**
   * Seconds to wait before retrying, parsed from the `Retry-After` response
   * header. `undefined` when the header was absent.
   */
  readonly retryAfter?: number;

  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Thrown when a request exceeds the configured `timeoutMs` or is cancelled
 * by the caller via an `AbortSignal`.
 *
 * The `message` field distinguishes the two cases:
 * - `'Request timed out'`  — the internal timeout elapsed.
 * - `'Request cancelled'`  — the caller's `AbortSignal` fired.
 */
export class TimeoutError extends StellarExplainError {
  constructor(message = "Request timed out") {
    super(message, "TIMEOUT");
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Thrown when a network-level failure prevents the request from completing
 * (e.g. DNS resolution failure, TCP connection refused).
 */
export class NetworkError extends StellarExplainError {
  constructor(message = "Network error") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when the upstream server returns a non-JSON body where the SDK
 * expected a JSON envelope, or when an unexpected upstream error occurs.
 *
 * The `statusCode` property contains the HTTP status returned by the server.
 */
export class UpstreamError extends StellarExplainError {
  constructor(message = "Upstream error", statusCode?: number) {
    super(message, "UPSTREAM_ERROR", statusCode);
    this.name = "UpstreamError";
    Object.setPrototypeOf(this, UpstreamError.prototype);
  }
}

/**
 * Thrown when a caller supplies invalid input (e.g. a malformed transaction
 * hash) before a network request is even made.
 */
export class InvalidInputError extends StellarExplainError {
  constructor(message = "Invalid input") {
    super(message, "INVALID_INPUT");
    this.name = "InvalidInputError";
    Object.setPrototypeOf(this, InvalidInputError.prototype);
  }
}
