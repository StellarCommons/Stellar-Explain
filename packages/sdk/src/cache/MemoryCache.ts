interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight in-memory cache with TTL expiry. Used internally by
 * `StellarExplainClient` — not exported from the public package entry point.
 *
 * @example
 * ```ts
 * const cache = new MemoryCache(5 * 60 * 1000); // 5-minute default TTL
 * cache.set('tx:abc', result);
 * const hit = cache.get<TransactionExplanation>('tx:abc'); // T | null
 * ```
 */
export class MemoryCache {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly ttl: number;

  /**
   * @param ttl Default time-to-live in **milliseconds**.
   *            Pass `0` to disable caching entirely (all `set` calls become
   *            no-ops and `get` always returns `null`).
   */
  constructor(ttl: number) {
    this.ttl = ttl;
  }

  /**
   * Number of entries currently held in the cache (including expired ones
   * not yet evicted). Use for observability / debugging only.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Retrieve a cached value.
   *
   * Returns `null` when the key is absent. If the entry exists but has
   * expired it is evicted and `null` is returned.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Store a value.
   *
   * @param key         Cache key.
   * @param value       Value to cache.
   * @param ttlOverride Optional TTL in **milliseconds** for this entry only.
   *                    When omitted the instance-level TTL is used.
   *
   * This method is a **no-op** when the effective TTL is `0`.
   */
  set<T>(key: string, value: T, ttlOverride?: number): void {
    const effectiveTtl = ttlOverride ?? this.ttl;
    if (effectiveTtl === 0) return;
    this.store.set(key, { value, expiresAt: Date.now() + effectiveTtl });
  }

  /** Remove a single entry by key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove all entries from the cache. */
  clear(): void {
    this.store.clear();
  }
}
