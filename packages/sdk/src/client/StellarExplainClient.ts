import { MemoryCache } from "../cache/MemoryCache.js";
import { PluginRegistry } from "../plugins/index.js";
import {
  CacheAdapter,
  InvalidInputError,
  SdkPlugin,
  StellarExplainClientConfig,
  StellarExplainError,
  TransactionExplanation,
  AccountExplanation,
  ApiError,
  FetchImpl,
  RequestOptions,
  SdkLogger,
  StellarExplainClientOptions,
} from "../types/index.js";
import {
  TimeoutError,
  ApiRequestError,
  UpstreamError,
} from "../errors/index.js";

export { TimeoutError, ApiRequestError, UpstreamError };
import { isValidTransactionHash, pLimit } from "../utils/index.js";

/** Default TTL for cached transaction explanations (5 minutes). */
const DEFAULT_TTL_SECONDS = 300;

// ── Signal helpers (module-private) ────────────────────────────────────────

/**
 * Merges two AbortSignals into one that fires when either fires.
 *
 * Uses `AbortSignal.any()` where supported (Node ≥ 20, modern browsers).
 * Falls back to a manual `AbortController` with one-shot event listeners.
 *
 * @param a - First signal.
 * @param b - Second signal.
 * @returns An object containing the merged `signal` and a `cleanup` function
 *   that removes the manually added listeners. Call `cleanup()` after the
 *   operation settles to prevent listener leaks. No-op when `AbortSignal.any`
 *   is available.
 */
function mergeSignals(
  a: AbortSignal,
  b: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any([a, b]), cleanup: () => undefined };
  }

  const controller = new AbortController();

  const onA = () => {
    if (!controller.signal.aborted) controller.abort(a.reason);
  };
  const onB = () => {
    if (!controller.signal.aborted) controller.abort(b.reason);
  };

  if (a.aborted) {
    controller.abort(a.reason);
  } else if (b.aborted) {
    controller.abort(b.reason);
  } else {
    a.addEventListener("abort", onA, { once: true });
    b.addEventListener("abort", onB, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      a.removeEventListener("abort", onA);
      b.removeEventListener("abort", onB);
    },
  };
}

/**
 * Returns a Promise that rejects with `TimeoutError('Request cancelled')`
 * as soon as `signal` fires, or immediately if it is already aborted.
 *
 * @param signal - The AbortSignal to watch.
 * @returns A Promise that never resolves and rejects on abort.
 */
function cancellationPromise<T>(signal: AbortSignal): Promise<T> {
  return new Promise<T>((_, reject) => {
    const abort = () => reject(new TimeoutError("Request cancelled"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

// ── Logger helpers ─────────────────────────────────────────────────────────

const NOOP_LOGGER: SdkLogger = {
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

// ── Client ─────────────────────────────────────────────────────────────────

/**
 * HTTP client for the Stellar Explain API.
 *
 * ### Features
 * - **In-flight deduplication** — identical concurrent requests share one HTTP
 *   call; only the first caller triggers network I/O.
 * - **Per-request timeout** — every call is guarded by a configurable timeout
 *   (default 30 s). Exceeded requests throw {@link TimeoutError}.
 * - **Request cancellation** — pass an `AbortSignal` to any method to cancel
 *   your own promise without aborting the shared network request.
 * - **Custom fetch** — supply any WHATWG-compatible `fetch` implementation
 *   (e.g. `undici`) via `options.fetchImpl` for Node 16 support or advanced
 *   connection-pool configuration.
 *
 * @example Minimal setup
 * ```ts
 * import { StellarExplainClient } from '@stellar-explain/sdk';
 *
 * const client = new StellarExplainClient({
 *   baseUrl: 'https://stellar-explain.example.com',
 * });
 * ```
 *
 * @example Fully configured
 * ```ts
 * import { fetch } from 'undici';
 * import { StellarExplainClient } from '@stellar-explain/sdk';
 *
 * const client = new StellarExplainClient({
 *   baseUrl: 'https://stellar-explain.example.com',
 *   timeoutMs: 10_000,   // 10-second timeout
 *   fetchImpl: fetch,    // undici on Node 16
 * });
 * ```
 */
export class StellarExplainClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchImpl;
  private readonly logger: SdkLogger;

  /**
   * In-flight deduplication map.
   *
   * Key   → stable cache key string (e.g. `"tx:<hash>"`).
   * Value → shared network Promise for that key.
   *
   * Entries are removed only when the underlying network request settles.
   * Consumer cancellation never removes an entry — the HTTP request remains
   * in-flight and may be shared with other consumers awaiting the same key.
   */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Creates a new `StellarExplainClient`.
   *
   * @param options - Configuration for the client instance.
   * @param options.baseUrl - Base URL of the Stellar Explain API server, without
   *   a trailing slash (e.g. `'https://stellar-explain.example.com'`).
   * @param options.timeoutMs - Maximum milliseconds to wait for any single
   *   request before throwing {@link TimeoutError}. Defaults to `30000`.
   * @param options.fetchImpl - WHATWG-compatible `fetch` function to use for
   *   all HTTP requests. Defaults to `globalThis.fetch`. Pass `undici`'s
   *   `fetch` (or the result of `createUndiciFetch`) for Node 16 support or
   *   custom connection-pool options.
   *
   * @example Minimal
   * ```ts
   * const client = new StellarExplainClient({
   *   baseUrl: 'https://stellar-explain.example.com',
   * });
   * ```
   *
   * @example With all options
   * ```ts
   * import { fetch } from 'undici';
   *
   * const client = new StellarExplainClient({
   *   baseUrl: 'https://stellar-explain.example.com',
   *   timeoutMs: 10_000,
   *   fetchImpl: fetch,
   * });
   * ```
   */
  constructor(options: StellarExplainClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.logger = options.logger ?? NOOP_LOGGER;
export class StellarExplainClient {
  private readonly baseUrl: string;
  private readonly plugins: PluginRegistry;
  private readonly cache: CacheAdapter;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(config: StellarExplainClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.plugins = new PluginRegistry(config.plugins);
    this.cache = config.cache ?? new MemoryCache();
  }

  explainTransaction(hash: string): Promise<TransactionExplanation> {
    const cacheKey = `tx:${hash}`;
    const cached = this.cache.get<TransactionExplanation>(cacheKey);
    if (cached !== null) return Promise.resolve(cached);

    return this.dedupe(cacheKey, () =>
      this.request(`${this.baseUrl}/api/tx/${hash}`)
    ).then((result) => {
      this.cache.set(cacheKey, result, DEFAULT_TTL_SECONDS);
      return result as TransactionExplanation;
    });
  }

  explainAccount(accountId: string): Promise<unknown> {
    return this.dedupe(`account:${accountId}`, () =>
      this.request(`${this.baseUrl}/api/account/${accountId}`)
    );
  }

  /**
   * Streams a Server-Sent Events (SSE) response for a Stellar transaction
   * explanation, yielding each partial result as it arrives.
   *
   * Designed for long-running explain requests where the server may take time
   * to produce a complete explanation. Each yielded string is the payload of
   * one SSE `data:` line with the prefix stripped.
   *
   * @param hash - The 64-character hex-encoded Stellar transaction hash.
   *
   * @returns An `AsyncGenerator` that yields each `data:` payload as a string.
   *
   * @throws {@link ApiRequestError} if `hash` is not a valid 64-character hex
   *   string, or if the server returns a non-2xx status.
   * @throws {@link TimeoutError} if more than `timeoutMs` milliseconds elapse
   *   between consecutive chunks (stream stall detection).
   *
   * @example Basic streaming
   * ```ts
   * for await (const chunk of client.explainTransactionStream('a1b2c3...')) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  async *explainTransactionStream(hash: string): AsyncGenerator<string> {
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
      throw new ApiRequestError({
        error: { code: "BAD_REQUEST", message: "Invalid transaction hash" },
      });
    }

    const res = await this.fetchImpl(
      `${this.baseUrl}/api/tx/${hash}/stream`,
      { headers: { Accept: "text/event-stream" } }
    );

    if (!res.ok) {
      const data = (await res.json()) as ApiError;
      throw new ApiRequestError(data);
    }

    if (!res.body) {
      throw new Error("Response body is null");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const readChunk = (): Promise<ReadableStreamReadResult<Uint8Array>> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new TimeoutError("Request timed out")),
          this.timeoutMs
        );
        reader.read().then(
          (result) => { clearTimeout(timer); resolve(result); },
          (err) => { clearTimeout(timer); reject(err); }
        );
      });

    try {
      while (true) {
        const { done, value } = await readChunk();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            yield line.slice(6);
          }
        }
      }

      // Flush any final bytes left in the decoder
      const tail = (buffer + decoder.decode()).trimEnd();
      if (tail.startsWith("data: ")) {
        yield tail.slice(6);
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Ensures at most one network request is in-flight per cache key.
   *
   * When `consumerSignal` is provided:
   * - Merges it with a fresh internal timeout signal using `mergeSignals`
   *   (`AbortSignal.any` or manual-listener fallback).
   * - Races the shared network Promise against the merged cancellation signal
   *   so the caller's Promise rejects promptly on either cancellation.
   * - The underlying `fetch` call and the dedup-map entry are unaffected:
   *   the fetch only carries its own timeout signal, and the map entry is
   *   cleared only when the network request itself settles.
   *
   * @param key - Stable string used to look up or store the in-flight Promise.
   * @param networkFactory - Zero-arg function that issues the actual HTTP request.
   * @param consumerSignal - Optional signal supplied by the caller.
   * @returns A Promise that resolves/rejects with the network result or a
   *   cancellation rejection.
   */
  private dedupe<T>(
    key: string,
    networkFactory: () => Promise<T>,
    consumerSignal?: AbortSignal
  ): Promise<T> {
    if (consumerSignal?.aborted) {
      return Promise.reject(new TimeoutError("Request cancelled"));
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      this.logger.debug("cache hit", { key });
    } else {
      this.logger.debug("cache miss", { key });
    }
    const networkPromise: Promise<T> =
      existing ?? this.startRequest(key, networkFactory);

    if (!consumerSignal) {
      return networkPromise;
    }

    // Build a consumer-side timeout so callers with a signal still experience
    // the configured timeout even if they never call abort() themselves.
    const timeoutController = new AbortController();
    const timer = setTimeout(
      () =>
        timeoutController.abort(
          new DOMException("Request timed out", "TimeoutError")
        ),
      this.timeoutMs
    );

    const { signal: mergedSignal, cleanup } = mergeSignals(
      timeoutController.signal,
      consumerSignal
  async batchExplainTransactions(
    hashes: string[],
    options?: { concurrency?: number }
  ): Promise<Array<TransactionExplanation | StellarExplainError>> {
    const concurrency = options?.concurrency ?? 3;
    const results = new Array<TransactionExplanation | StellarExplainError>(
      hashes.length
    );
    const pending: Array<{ index: number; hash: string }> = [];

    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i];
      if (!isValidTransactionHash(hash)) {
        results[i] = new InvalidInputError(hash);
      } else {
        const cached = this.cache.get<TransactionExplanation>(`tx:${hash}`);
        if (cached !== null) {
          results[i] = cached;
        } else {
          pending.push({ index: i, hash });
        }
      }
    }

    const tasks = pending.map(({ index, hash }) => async () => {
      try {
        results[index] = await this.explainTransaction(hash);
      } catch (err) {
        results[index] =
          err instanceof StellarExplainError
            ? err
            : new StellarExplainError(
                err instanceof Error ? err.message : "Unknown error"
              );
      }
    });

    await pLimit(tasks, concurrency);
    return results;
  }

  /**
   * Performs a single JSON `GET` request to `path`, guarded by the internal
   * timeout only.
   *
   * The consumer signal is deliberately **not** forwarded to `fetch()` — doing
   * so would abort the network request on consumer cancellation and clear the
   * dedup-map entry prematurely. Consumer cancellation is handled upstream in
   * `dedupe()` via `Promise.race`.
   *
   * @param path - URL path relative to `baseUrl` (must start with `/`).
   * @returns A Promise that resolves to the parsed JSON body typed as `T`.
   * @throws {@link TimeoutError} if the request exceeds `timeoutMs`.
   * @throws {@link ApiRequestError} if the response status is not 2xx.
   * @throws {@link UpstreamError} if the server responds with a non-JSON body.
   */
  private async fetchJson<T>(path: string): Promise<T> {
    const timeoutController = new AbortController();
    const timer = setTimeout(
      () =>
        timeoutController.abort(
          new DOMException("Request timed out", "TimeoutError")
        ),
      this.timeoutMs
    );
  private async request(url: string): Promise<unknown> {
    const init = await this.plugins.runBeforeRequest(url, {});

    const start = Date.now();
    this.logger.debug("request start", { path });

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      const error = new StellarExplainError(
        err instanceof Error ? err.message : "Network error",
        undefined,
        url
      );
      this.plugins.runOnError(error);
      throw error;
    }

      const raw = await res.text();
      let data: T | ApiError;

      try {
        data = JSON.parse(raw) as T | ApiError;
      } catch {
        const preview = raw.slice(0, 200);
        throw new UpstreamError(
          `Received non-JSON response from server (status ${res.status}): ${preview}`,
          res.status
        );
      }
    response = await this.plugins.runAfterResponse(response);

    if (!response.ok) {
      const error = new StellarExplainError(
        `Request failed: ${response.status}`,
        response.status,
        url
      );
      this.plugins.runOnError(error);
      throw error;
    }

      return data as T;
    } catch (err) {
      if (err instanceof ApiRequestError || err instanceof UpstreamError) {
        throw err;
      }
    return response.json();
  }

  private dedupe(key: string, fn: () => Promise<unknown>): Promise<unknown> {
    const existing = this.inFlight.get(key);
    if (existing) return existing;

      throw err;
    } finally {
      clearTimeout(timer);
      this.logger.debug("request end", { path, durationMs: Date.now() - start });
    }
    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export type {
  CacheAdapter,
  InvalidInputError,
  SdkPlugin,
  StellarExplainClientConfig,
  StellarExplainError,
  TransactionExplanation,
};
