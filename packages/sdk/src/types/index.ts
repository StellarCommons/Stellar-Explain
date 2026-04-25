// ── Error codes ────────────────────────────────────────────────────────────

/**
 * Union of all machine-readable error codes the SDK can emit.
 * Use these with `instanceof` checks on the typed error classes.
 */
export type SdkErrorCode =
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UPSTREAM_ERROR"
  | "INVALID_INPUT";

// ── API response shapes ─────────────────────────────────────────────────────

/**
 * A single payment operation within a transaction explanation.
 */
export interface PaymentExplanation {
  /** Stellar account ID of the sender. */
  from: string;
  /** Stellar account ID of the recipient. */
  to: string;
  /** Human-readable amount transferred (e.g. `"10.0000000"`). */
  amount: string;
  /** Asset identifier (e.g. `"XLM"` or `"USDC:GABC..."`). */
  asset: string;
  /** Plain-language summary of this payment. */
  summary: string;
}

/**
 * Full explanation of a Stellar transaction as returned by the backend.
 */
export interface TransactionExplanation {
  /** 64-character hex-encoded transaction hash. */
  hash: string;
  /** Plain-language summary of what the transaction did. */
  summary: string;
  /** Whether the transaction was applied to the ledger. */
  status: "success" | "failed";
  /** Ledger sequence number in which the transaction was included. */
  ledger: number;
  /** ISO-8601 timestamp of the ledger close time. */
  created_at: string;
  /** Fee deducted from the source account, in stroops. */
  fee_charged: string;
  /** Optional memo attached to the transaction, or `null`. */
  memo: string | null;
  /** Explanation of each payment operation in the transaction. */
  payments: PaymentExplanation[];
  /** Count of operations that were skipped during explanation. */
  skipped_operations: number;
}

/**
 * A single asset balance entry on an account.
 */
export interface AssetBalance {
  /** Asset type: `"native"`, `"credit_alphanum4"`, or `"credit_alphanum12"`. */
  asset_type: string;
  /** Asset code (e.g. `"USDC"`). Only present for non-native assets. */
  asset_code?: string;
  /** Issuer account ID. Only present for non-native assets. */
  asset_issuer?: string;
  /** String-encoded balance (e.g. `"100.0000000"`). */
  balance: string;
}

/**
 * A signer entry on an account.
 */
export interface Signer {
  /** Public key of the signer. */
  key: string;
  /** Weight assigned to this signer. */
  weight: number;
  /** Signer type (e.g. `"ed25519_public_key"`, `"hash_x"`). */
  type: string;
}

/**
 * Full explanation of a Stellar account as returned by the backend.
 */
export interface AccountExplanation {
  /** Stellar account ID (G-address). */
  account_id: string;
  /** Plain-language summary of the account. */
  summary: string;
  /** Ledger sequence number of the last modification to this account. */
  last_modified_ledger: number;
  /** Number of sub-entries (offers, trustlines, signers, data entries). */
  subentry_count: number;
  /** Optional home domain set on the account. */
  home_domain?: string;
  /** All asset balances held by the account. */
  balances: AssetBalance[];
  /** All signers authorised on the account. */
  signers: Signer[];
}

/**
 * Response from the `/health` endpoint.
 */
export interface HealthResponse {
  /** Overall health status of the service. */
  status: "ok" | "degraded" | "down";
  /** Whether the service can currently reach Horizon. */
  horizon_reachable: boolean;
  /** Deployed version of the Stellar Explain backend. */
  version: string;
}

// ── Internal / client-config types ─────────────────────────────────────────

/**
 * Shape of an API error body returned by the backend on non-2xx responses.
 */
export interface ApiError {
  error: {
    /** Machine-readable error code. */
    code: string;
    /** Human-readable description. */
    message: string;
  };
}

/** WHATWG-compatible `fetch` function signature. */
export type FetchImpl = typeof fetch;

/**
 * Minimal logger interface accepted by {@link StellarExplainClientConfig}.
 * Any `console`-compatible object, `pino`, or `winston` instance works.
 */
export interface SdkLogger {
  /** Emitted for cache hits/misses and request timings. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Emitted on each retry attempt. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Emitted when all retries are exhausted. */
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Plugin hook interface for intercepting requests and responses.
 */
export interface SdkPlugin {
  /** Unique plugin name used for debugging. */
  name: string;
  /** Modify or annotate the outgoing `RequestInit` before the fetch is sent. */
  beforeRequest?: (
    url: string,
    init: RequestInit,
  ) => RequestInit | Promise<RequestInit>;
  /** Inspect or transform the raw `Response` after it arrives. */
  afterResponse?: (response: Response) => Response | Promise<Response>;
  /** Called whenever the SDK emits an error. */
  onError?: (error: Error) => void;
}

/**
 * Contract for any object used as a response cache by the SDK.
 */
export interface CacheAdapter {
  /** Return the cached value, or `null` if absent or expired. */
  get<T>(key: string): T | null;
  /** Store a value. `ttl` is in milliseconds; `0` disables caching. */
  set<T>(key: string, value: T, ttl: number): void;
  /** Remove a single entry. */
  delete(key: string): void;
  /** Remove all entries. */
  clear(): void;
}

/**
 * Per-call options accepted by client methods.
 */
export interface RequestOptions {
  /**
   * An `AbortSignal` that cancels this specific call when aborted.
   * The Promise rejects with `TimeoutError('Request cancelled')`.
   */
  signal?: AbortSignal;
}

/**
 * Configuration accepted by `StellarExplainClient`.
 * All optional fields have sensible defaults documented below.
 */
export interface StellarExplainClientConfig {
  /**
   * Base URL of the Stellar Explain API server, without a trailing slash.
   * @example "https://api.stellar-explain.example.com"
   */
  baseUrl: string;

  /**
   * Maximum milliseconds to wait for any single request before throwing
   * `TimeoutError`.
   * @default 30000
   */
  timeoutMs?: number;

  /**
   * WHATWG-compatible `fetch` implementation used for all HTTP requests.
   * Defaults to `globalThis.fetch`. Supply `undici`'s `fetch` for Node 16
   * or custom connection-pool configuration.
   * @example
   * ```ts
   * import { fetch } from 'undici';
   * new StellarExplainClient({ baseUrl: '...', fetchImpl: fetch });
   * ```
   */
  fetchImpl?: FetchImpl;

  /**
   * Optional structured logger. When omitted all logging is suppressed.
   * Pass `console`, a `pino` instance, or any `SdkLogger`-compatible
   * object to route SDK output into your own infrastructure.
   * @example
   * ```ts
   * new StellarExplainClient({ baseUrl: '...', logger: console });
   * ```
   */
  logger?: SdkLogger;

  /**
   * Plugin hooks executed around every request/response cycle.
   * Plugins run in declaration order.
   */
  plugins?: SdkPlugin[];

  /**
   * Response cache used to avoid redundant network calls.
   * Defaults to an internal `MemoryCache` with a 5-minute TTL.
   * Supply a custom `CacheAdapter` to use a different backend.
   */
  cache?: CacheAdapter;

  /**
   * Number of additional retry attempts after a failed request.
   * `NotFoundError` (HTTP 404) is never retried regardless of this value.
   * @default 0
   */
  retries?: number;

  /**
   * Base delay in milliseconds before the first retry.
   * Each subsequent retry doubles the delay (exponential backoff).
   * @default 1000
   */
  retryDelay?: number;
}
