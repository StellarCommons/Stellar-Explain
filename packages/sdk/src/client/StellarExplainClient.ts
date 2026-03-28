import { MemoryCache } from "../cache/MemoryCache.js";
import { PluginRegistry } from "../plugins/index.js";
import {
  CacheAdapter,
  InvalidInputError,
  SdkPlugin,
  StellarExplainClientConfig,
  StellarExplainError,
  TransactionExplanation,
} from "../types/index.js";
import { isValidTransactionHash, pLimit } from "../utils/index.js";

/** Default TTL for cached transaction explanations (5 minutes). */
const DEFAULT_TTL_SECONDS = 300;

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

  private async request(url: string): Promise<unknown> {
    const init = await this.plugins.runBeforeRequest(url, {});

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

    return response.json();
  }

  private dedupe(key: string, fn: () => Promise<unknown>): Promise<unknown> {
    const existing = this.inFlight.get(key);
    if (existing) return existing;

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
