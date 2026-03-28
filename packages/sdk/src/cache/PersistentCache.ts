import type { CacheAdapter } from "./CacheAdapter.js";
import { MemoryCache } from "./MemoryCache.js";

/**
 * Provisional persistent cache scaffold.
 *
 * The repository currently has no broader cache subsystem, so this class is
 * intentionally self-contained and conservative. When `localStorage` is not
 * available (for example in Node.js or SSR), it falls back to `MemoryCache`
 * and warns once per instance.
 */
export class PersistentCache implements CacheAdapter {
  private readonly fallback = new MemoryCache();
  private readonly namespace: string;
  private warnedAboutFallback = false;
  private usingFallback = false;

  constructor(namespace = "stellar-explain:sdk") {
    this.namespace = namespace;

    if (!this.hasLocalStorage()) {
      this.activateFallback();
    }
  }

  get isUsingFallback(): boolean {
    return this.usingFallback;
  }

  get<T>(key: string): T | undefined {
    if (this.shouldUseFallback()) {
      return this.fallback.get<T>(key);
    }

    const raw = localStorage.getItem(this.storageKey(key));

    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as T;
  }

  set<T>(key: string, value: T): void {
    if (this.shouldUseFallback()) {
      this.fallback.set(key, value);
      return;
    }

    localStorage.setItem(this.storageKey(key), JSON.stringify(value));
  }

  delete(key: string): void {
    if (this.shouldUseFallback()) {
      this.fallback.delete(key);
      return;
    }

    localStorage.removeItem(this.storageKey(key));
  }

  clear(): void {
    if (this.shouldUseFallback()) {
      this.fallback.clear();
      return;
    }

    const prefix = `${this.namespace}:`;

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);

      if (key?.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private hasLocalStorage(): boolean {
    return typeof localStorage !== "undefined";
  }

  private shouldUseFallback(): boolean {
    if (this.usingFallback) {
      return true;
    }

    if (!this.hasLocalStorage()) {
      this.activateFallback();
      return true;
    }

    return false;
  }

  private activateFallback(): void {
    this.usingFallback = true;

    if (!this.warnedAboutFallback) {
      console.warn(
        "[stellar-explain/sdk] localStorage is unavailable; " +
          "PersistentCache is using MemoryCache as a provisional fallback."
      );
      this.warnedAboutFallback = true;
    }
  }
}
