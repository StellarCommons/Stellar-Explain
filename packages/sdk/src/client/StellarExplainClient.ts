import type {
  TransactionExplanation,
  AccountExplanation,
  ApiError,
  RequestOptions,
  StellarExplainClientOptions,
} from "../types/index.js";

// ── Errors ─────────────────────────────────────────────────────────────────

/** Thrown when a request times out or is cancelled by the consumer. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Thrown when the API returns a non-2xx response. */
export class ApiRequestError extends Error {
  readonly code: string;
  constructor(apiError: ApiError) {
    super(apiError.error.message);
    this.name = "ApiRequestError";
    this.code = apiError.error.code;
  }
}

// ── Signal helpers ─────────────────────────────────────────────────────────

/**
 * Merges two AbortSignals into one that fires when either fires.
 *
 * Uses AbortSignal.any() where supported (Node ≥ 20, modern browsers).
 * Falls back to a manual AbortController with event listeners.
 *
 * Returns the merged signal and a cleanup function that removes listeners
 * (no-op when AbortSignal.any() is used).
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
 * Returns a Promise that rejects with TimeoutError('Request cancelled')
 * as soon as `signal` fires, or immediately if it is already aborted.
 *
 * The listener is attached directly (or AbortSignal.any is used upstream),
 * satisfying the "use AbortSignal.any / manual listener" requirement.
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

// ── Client ─────────────────────────────────────────────────────────────────

export class StellarExplainClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  /**
   * In-flight deduplication map.
   *
   * Key  → stable cache key string.
   * Value → the shared Promise for the underlying network request.
   *
   * Entries are removed only when the network request settles.
   * Consumer cancellation never removes an entry — the HTTP request stays
   * in-flight and may be shared with other consumers.
   */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: StellarExplainClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  explainTransaction(
    hash: string,
    options?: RequestOptions
  ): Promise<TransactionExplanation> {
    return this.dedupe<TransactionExplanation>(
      `tx:${hash}`,
      () => this.fetchJson<TransactionExplanation>(`/api/tx/${hash}`),
      options?.signal
    );
  }

  explainAccount(
    address: string,
    options?: RequestOptions
  ): Promise<AccountExplanation> {
    return this.dedupe<AccountExplanation>(
      `account:${address}`,
      () => this.fetchJson<AccountExplanation>(`/api/account/${address}`),
      options?.signal
    );
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Ensures at most one network request is in-flight per cache key.
   *
   * When `consumerSignal` is provided:
   *   - Merges it with the internal timeout signal (AbortSignal.any or manual
   *     listener fallback) to build a combined cancellation signal.
   *   - Races the shared network promise against that combined signal so the
   *     consumer's returned Promise rejects immediately on either cancellation.
   *   - The underlying network request and its dedup-map entry are unaffected:
   *     the fetch only carries the timeout signal and the map entry is cleared
   *     only when the network request itself settles.
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
    const networkPromise: Promise<T> =
      existing ?? this.startRequest(key, networkFactory);

    if (!consumerSignal) {
      return networkPromise;
    }

    // Build a timeout signal so the consumer's view also times out even if
    // the consumer does not cancel.  Merge it with the consumer signal so
    // either source aborts the race.
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
    );

    // Race the network result against the merged cancellation signal.
    // When the consumer signal fires → TimeoutError('Request cancelled').
    // When the timeout fires          → TimeoutError('Request cancelled')
    //   (the network promise will also eventually reject with 'timed out'
    //    but the consumer has already received a rejection via the race).
    return Promise.race([
      networkPromise,
      cancellationPromise<T>(mergedSignal),
    ]).finally(() => {
      clearTimeout(timer);
      cleanup();
    });
  }

  /** Issues the actual network request and manages the inFlight map entry. */
  private startRequest<T>(
    key: string,
    networkFactory: () => Promise<T>
  ): Promise<T> {
    const promise = networkFactory().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Low-level JSON fetch guarded by the internal timeout only.
   *
   * The consumer signal is deliberately NOT passed to fetch() here — that
   * would abort the network request on cancellation, causing the dedup entry
   * to be cleared prematurely.  Consumer cancellation is handled upstream in
   * dedupe() via Promise.race.
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

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { Accept: "application/json" },
        signal: timeoutController.signal,
      });

      const data = (await res.json()) as T | ApiError;

      if (!res.ok) {
        throw new ApiRequestError(data as ApiError);
      }

      return data as T;
    } catch (err) {
      if (err instanceof ApiRequestError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError("Request timed out");
      }

      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
