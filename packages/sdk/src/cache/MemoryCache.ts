import { CacheAdapter } from "../types/index.js";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache implements CacheAdapter {
  private readonly store = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
