import type { CacheAdapter } from "./CacheAdapter.js";

/**
 * Minimal in-memory cache used as the provisional fallback backend.
 */
export class MemoryCache implements CacheAdapter {
  private readonly store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
