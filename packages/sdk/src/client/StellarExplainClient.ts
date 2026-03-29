import { MemoryCache } from "../cache/MemoryCache.js";
import { PluginRegistry } from "../plugins/index.js";
import {
  NetworkError,
  NotFoundError,
  RateLimitError,
  StellarExplainError,
  TimeoutError,
  UpstreamError,
} from "../errors/index.js";
import { withRetry } from "../utils/index.js";
import {
  validateTransactionHash,
  validateAccountAddress,
  withRetry,
} from "../utils/index.js";
import type {
  AccountExplanation,
  ApiError,
  CacheAdapter,
  FetchImpl,
  HealthResponse,
  SdkLogger,
  StellarExplainClientConfig,
  TransactionExplanation,
} from "../types/index.js";

const DEFAULT_BASE_URL = "https://api.stellarexplain.io";

/** Default TTL for cached responses: 5 minutes in milliseconds. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const NOOP_LOGGER: SdkLogger = {
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * HTTP client for the Stellar Explain API.
 *
 * ### Features
 * - **Response caching** — configurable TTL cache avoids redundant network
 *   calls. Defaults to an in-memory 5-minute cache.
 * - **In-flight deduplication** — identical concurrent requests share one
 *   HTTP call.
 * - **Per-request timeout** — every call is guarded by a configurable timeout
 *   (default 30 s). Exceeded requests throw {@link TimeoutError}.
 * - **Plugin hooks** — intercept requests and responses via `plugins`.
 * - **Custom fetch** — supply any WHATWG-compatible `fetch` implementation
 *   via `config.fetchImpl` for Node 16 support or custom connection pools.
 *
 * @example Minimal setup
 * ```ts
 * import { StellarExplainClient } from '@stellar-explain/sdk';
 *
 * const client = new StellarExplainClient({
 *   baseUrl: 'https://stellar-explain.example.com',
 * });
 * ```
 */
export class StellarExplainClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly fetchImpl: FetchImpl;
  private readonly logger: SdkLogger;
  private readonly plugins: PluginRegistry;
  private readonly cache: CacheAdapter;

  /** In-flight deduplication map: cache key → shared network Promise. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(config: StellarExplainClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.retries = config.retries ?? 0;
    this.retryDelay = config.retryDelay ?? 1_000;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.logger = config.logger ?? NOOP_LOGGER;
    this.plugins = new PluginRegistry(config.plugins);
    this.cache = config.cache ?? new MemoryCache(DEFAULT_TTL_MS);
  }

  /**
   * Explain a Stellar transaction by its hash.
   *
   * @throws {@link InvalidInputError} for a malformed hash.
   * @throws {@link NotFoundError} when the transaction is not found.
   * @throws {@link TimeoutError} when the request exceeds `timeoutMs`.
   * @throws {@link NetworkError} on network-level failures.
   * @throws {@link UpstreamError} on unexpected non-JSON responses.
   */
  async explainTransaction(hash: string): Promise<TransactionExplanation> {
    validateTransactionHash(hash);

    const key = `tx:${hash}`;
    const cached = this.cache.get<TransactionExplanation>(key);
    if (cached !== null) {
      this.logger.debug("cache hit", { key });
      return cached;
    }

    const result = await this.dedupe(key, () =>
      withRetry(
        () => this.fetchJson<TransactionExplanation>(`${this.baseUrl}/api/tx/${hash}`),
        2,
        500,
        (err) => !(err instanceof NotFoundError),
      ),
    );

    this.cache.set(key, result, DEFAULT_TTL_MS);
    return result;
  }

  /**
   * Explain a Stellar account by its account ID.
   *
   * @throws {@link NotFoundError} when the account is not found.
   * @throws {@link TimeoutError} when the request exceeds `timeoutMs`.
   * @throws {@link NetworkError} on network-level failures.
   * @throws {@link UpstreamError} on unexpected non-JSON responses.
   */
  async explainAccount(accountId: string): Promise<AccountExplanation> {
    if (!/^G[A-Z2-7]{55}$/.test(accountId)) {
      throw new InvalidInputError(`Invalid account address: "${accountId}"`);
    }
    validateAccountAddress(accountId);

    const key = `account:${accountId}`;
    const cached = this.cache.get<AccountExplanation>(key);
    if (cached !== null) {
      this.logger.debug("cache hit", { key });
      return cached;
    }

    const result = await this.dedupe(key, () =>
      this.fetchJsonWithRetry<AccountExplanation>(
        `${this.baseUrl}/api/account/${accountId}`,
      withRetry(
        () => this.fetchJson<AccountExplanation>(`${this.baseUrl}/api/account/${accountId}`),
        2,
        500,
        (err) => !(err instanceof NotFoundError),
      ),
    );

    this.cache.set(key, result, DEFAULT_TTL_MS);
    return result;
  }

  /**
   * Check the health of the Stellar Explain API.
   *
   * @throws {@link TimeoutError} when the request exceeds `timeoutMs`.
   * @throws {@link NetworkError} on network-level failures.
   */
  async health(): Promise<HealthResponse> {
    return this.fetchJson<HealthResponse>(`${this.baseUrl}/health`);
  }

  /** Clears all cached responses. */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Ensures at most one network request is in-flight per cache key.
   * The map entry is cleared when the network request settles.
   */
  private dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      this.logger.debug("dedup hit", { key });
      return existing;
    }

    const promise = factory().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise as Promise<unknown>);
    return promise;
  }

  /** Wraps `fetchJson` with the configured retry/backoff policy. */
  private fetchJsonWithRetry<T>(url: string): Promise<T> {
    return withRetry(() => this.fetchJson<T>(url), {
      maxRetries: this.retries,
      retryDelay: this.retryDelay,
      shouldRetry: (err) => !(err instanceof NotFoundError),
    });
  }

  /**
   * Performs a single JSON GET request guarded by the internal timeout.
   * Runs plugin hooks around every request.
   */
  private async fetchJson<T>(url: string): Promise<T> {
    const timeoutController = new AbortController();
    const timer = setTimeout(
      () =>
        timeoutController.abort(
          new DOMException("Request timed out", "TimeoutError"),
        ),
      this.timeoutMs,
    );

    const init: RequestInit = { signal: timeoutController.signal };

    let resolvedInit: RequestInit;
    try {
      resolvedInit = await this.plugins.runBeforeRequest(url, init);
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }

    this.logger.debug("request start", { url });
    const start = Date.now();

    let response: Response;
    try {
      response = await this.fetchImpl(url, resolvedInit);
    } catch (err) {
      clearTimeout(timer);
      if (
        err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError")
      ) {
        const error = new TimeoutError("Request timed out");
        this.plugins.runOnError(error);
        throw error;
      }
      const error = new NetworkError(
        err instanceof Error ? err.message : "Network error",
      );
      this.plugins.runOnError(error);
      throw error;
    } finally {
      clearTimeout(timer);
    }

    this.logger.debug("request end", {
      url,
      status: response.status,
      durationMs: Date.now() - start,
    });

    response = await this.plugins.runAfterResponse(response);

    const raw = await response.text();
    let data: T | ApiError;

    try {
      data = JSON.parse(raw) as T | ApiError;
    } catch {
      const preview = raw.slice(0, 200);
      const error = new UpstreamError(
        `Received non-JSON response from server (status ${response.status}): ${preview}`,
        response.status,
      );
      this.plugins.runOnError(error);
      throw error;
    }

    if (!response.ok) {
      const apiError = data as ApiError;
      let error: StellarExplainError;

      if (response.status === 404) {
        error = new NotFoundError(apiError.error?.message);
      } else if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : undefined;
        error = new RateLimitError(apiError.error?.message, retryAfter);
      } else {
        error = new UpstreamError(
          apiError.error?.message ?? `HTTP ${response.status}`,
          response.status,
        );
      }

      this.plugins.runOnError(error);
      throw error;
    }

    return data as T;
  }
}
