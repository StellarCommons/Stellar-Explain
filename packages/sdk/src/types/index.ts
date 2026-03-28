/**
 * A single payment operation within a Stellar transaction, broken down into
 * human-readable fields.
 */
export interface PaymentExplanation {
  /** Plain-English summary of the payment (e.g. `'Sent 10 XLM to GABC…'`). */
  summary: string;
  /** Stellar address of the account that sent the payment. */
  from: string;
  /** Stellar address of the account that received the payment. */
  to: string;
  /** Asset code and issuer (e.g. `'XLM'`, `'USDC:GA5ZSE…'`). */
  asset: string;
  /** Human-readable amount including asset code (e.g. `'10.0000000 XLM'`). */
  amount: string;
}

/**
 * Full explanation of a Stellar transaction, as returned by
 * {@link StellarExplainClient.explainTransaction}.
 */
export interface TransactionExplanation {
  /** Hex-encoded transaction hash that uniquely identifies this transaction. */
  transaction_hash: string;
  /** Whether all operations in the transaction were applied successfully. */
  successful: boolean;
  /** One-sentence plain-English summary of the overall transaction. */
  summary: string;
  /** Explanations for each payment operation found in the transaction. */
  payment_explanations: PaymentExplanation[];
  /** Number of non-payment operations that were present but not explained. */
  skipped_operations: number;
  /** Human-readable memo text, or `null` if the transaction has no memo. */
  memo_explanation: string | null;
  /** Formatted fee amount (e.g. `'0.00001 XLM'`), or `null` if unavailable. */
  fee_explanation: string | null;
  /** ISO 8601 timestamp when the ledger containing this transaction closed,
   *  or `null` if the ledger data is unavailable. */
  ledger_closed_at: string | null;
  /** Ledger sequence number that includes this transaction, or `null`. */
  ledger: number | null;
}

/**
 * Summary explanation of a Stellar account, as returned by
 * {@link StellarExplainClient.explainAccount}.
 */
export interface AccountExplanation {
  /** The Stellar account address (G… or M… encoded). */
  address: string;
  /** One-sentence plain-English summary of the account's purpose and state. */
  summary: string;
  /** Native XLM balance formatted as a decimal string (e.g. `'100.0000000'`). */
  xlm_balance: string;
  /** Total number of non-XLM trustlines held by this account. */
  asset_count: number;
  /** Number of signers (including the master key) authorised on this account. */
  signer_count: number;
  /** Home domain set on the account, or `null` if not configured. */
  home_domain: string | null;
  /** Organisation name resolved from the home domain's stellar.toml, or `null`. */
  org_name: string | null;
  /** Human-readable descriptions of each account flag that is currently set. */
  flag_descriptions: string[];
}

/**
 * Response shape for the API health-check endpoint.
 */
export interface HealthResponse {
  /** Coarse health status string (e.g. `'ok'`). */
  status: string;
  /** Stellar network the server is connected to (e.g. `'mainnet'`, `'testnet'`). */
  network: string;
  /** Whether the server can currently reach the Stellar Horizon node. */
  horizon_reachable: boolean;
  /** Semantic version of the running server (e.g. `'1.2.3'`). */
  version: string;
}

/**
 * Error envelope returned by the API for all non-2xx responses.
 *
 * The `error.code` field is machine-readable and suitable for `switch`
 * statements; `error.message` is intended for display to end users.
 */
export interface ApiError {
  error: {
    /** Machine-readable error code (e.g. `'NOT_FOUND'`, `'BAD_REQUEST'`). */
    code: string;
    /** Human-readable error description. */
    message: string;
  };
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
}

/**
 * Minimal WHATWG-compatible `fetch` function accepted as `fetchImpl`.
 *
 * Satisfied by `globalThis.fetch` (Node 18+, browsers) and by
 * `undici`'s `fetch` (Node 16+).
 */
export type FetchImpl = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

/**
 * Constructor options for {@link StellarExplainClient}.
 */
export interface StellarExplainClientOptions {
  /**
   * Base URL of the Stellar Explain API server, without a trailing slash.
   *
   * @example `'https://stellar-explain.example.com'`
   */
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
}
