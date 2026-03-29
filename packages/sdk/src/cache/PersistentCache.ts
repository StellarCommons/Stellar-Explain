import type { CacheAdapter } from "../types/index.js";
import { MemoryCache } from "./MemoryCache.js";

interface StoredEntry<T> {
  value: T;
  expiresAt: number;
}

function isLocalStorageAvailable(): boolean {
  try {
    const probe = "__stellar_sdk_probe__";
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export interface PersistentCacheOptions {
  /** Key prefix written to localStorage — prevents collisions with other libs. */
  namespace?: string;
  /** Default TTL in milliseconds. @default 300000 (5 minutes) */
  ttl?: number;
}

/**
 * `CacheAdapter` backed by `localStorage` with TTL support.
 *
 * Falls back to an in-memory `MemoryCache` when `localStorage` is unavailable
 * (Node.js, SSR, private-browsing quota exceeded, etc.).
 */
export class PersistentCache implements CacheAdapter {
  private readonly namespace: string;
  private readonly fallback: MemoryCache;
  private readonly persistent: boolean;

  constructor(options: PersistentCacheOptions = {}) {
    this.namespace = options.namespace ?? "stellar_sdk";
    this.fallback = new MemoryCache(options.ttl ?? 300_000);
    this.persistent = isLocalStorageAvailable();
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  get<T>(key: string): T | null {
    if (!this.persistent) return this.fallback.get<T>(key);

    try {
      const raw = localStorage.getItem(this.storageKey(key));
      if (!raw) return null;

      const entry = JSON.parse(raw) as StoredEntry<T>;
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.storageKey(key));
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T, ttl: number): void {
    if (!this.persistent) {
      this.fallback.set(key, value, ttl);
      return;
    }

    const entry: StoredEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
    };

    try {
      localStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      // Quota exceeded or serialisation failure — degrade to memory.
      this.fallback.set(key, value, ttl);
    }
  }

  delete(key: string): void {
    if (!this.persistent) {
      this.fallback.delete(key);
      return;
    }
    try {
      localStorage.removeItem(this.storageKey(key));
    } catch {
      this.fallback.delete(key);
    }
  }

  clear(): void {
    if (!this.persistent) {
      this.fallback.clear();
      return;
    }
    try {
      const prefix = `${this.namespace}:`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      this.fallback.clear();
    }
  }
}
