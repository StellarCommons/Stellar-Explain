export class StellarExplainError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "StellarExplainError";
  }
}

export class InvalidInputError extends StellarExplainError {
  constructor(hash: string) {
    super(`Invalid transaction hash: "${hash}"`);
    this.name = "InvalidInputError";
  }
}

export interface PaymentExplanation {
  summary: string;
  from: string;
  to: string;
  asset: string;
  amount: string;
}

export interface TransactionExplanation {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  payment_explanations: PaymentExplanation[];
  skipped_operations: number;
}

export interface SdkPlugin {
  name: string;
  beforeRequest?: (
    url: string,
    init: RequestInit
  ) => RequestInit | Promise<RequestInit>;
  afterResponse?: (response: Response) => Response | Promise<Response>;
  onError?: (error: StellarExplainError) => void;
}

/**
 * Minimal logger interface accepted by {@link StellarExplainClient}.
 *
 * Any object satisfying this shape can be passed as `options.logger` — a
 * `console`-compatible object, a `pino` / `winston` instance, or a custom
 * adapter all work without additional wrappers.
 *
 * @example Forwarding to `console`
 * ```ts
 * const client = new StellarExplainClient({
 *   baseUrl: 'https://api.example.com',
 *   logger: console,
 * });
 * ```
 *
 * @example Forwarding to `pino`
 * ```ts
 * import pino from 'pino';
 * const client = new StellarExplainClient({
 *   baseUrl: 'https://api.example.com',
 *   logger: pino(),
 * });
 * ```
 */
export interface SdkLogger {
  /** Emitted for cache hits/misses and request start/end timings. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Emitted on each retry attempt, including the attempt number and delay. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Emitted when all retries are exhausted and the error is final. */
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Per-call options accepted by {@link StellarExplainClient.explainTransaction}
 * and {@link StellarExplainClient.explainAccount}.
 */
export interface RequestOptions {
  /**
   * An `AbortSignal` that cancels this specific call when aborted.
   *
   * When the signal fires the returned Promise rejects with
   * `TimeoutError('Request cancelled')`. The underlying HTTP request is
   * **not** aborted — it continues in-flight and may be shared with other
   * callers awaiting the same resource.
   */
  signal?: AbortSignal;
export interface CacheAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface StellarExplainClientConfig {
  baseUrl: string;

  /**
   * Maximum number of milliseconds to wait for any single request before
   * throwing {@link TimeoutError}.
   *
   * @default 30000
   */
  timeoutMs?: number;

  /**
   * Custom fetch implementation used for all HTTP requests.
   *
   * Defaults to `globalThis.fetch`. Pass `undici`'s `fetch` (or the result
   * of `createUndiciFetch`) when running on Node 16 or when you need custom
   * connection-pool configuration.
   *
   * @example
   * ```ts
   * import { fetch } from 'undici';
   * new StellarExplainClient({ baseUrl: '...', fetchImpl: fetch });
   * ```
   */
  fetchImpl?: FetchImpl;

  /**
   * Optional logger for SDK debug output.
   *
   * When omitted, all logging is suppressed (no-op). Supply any object that
   * satisfies {@link SdkLogger} — `console`, `pino`, `winston`, etc. — to
   * route SDK output into your own logging infrastructure.
   *
   * @example
   * ```ts
   * new StellarExplainClient({ baseUrl: '...', logger: console });
   * ```
   */
  logger?: SdkLogger;
  plugins?: SdkPlugin[];
  cache?: CacheAdapter;
}
