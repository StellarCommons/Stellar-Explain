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
import { CacheAdapter } from "../types/index.js";
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
}

/**
 * CacheAdapter backed by localStorage with TTL support.
 * Falls back to an in-memory MemoryCache when localStorage is unavailable
 * (Node.js, SSR, private-browsing quota exceeded, etc.).
 */
export class PersistentCache implements CacheAdapter {
  private readonly namespace: string;
  private readonly fallback: MemoryCache;
  private readonly persistent: boolean;

  constructor(options: PersistentCacheOptions = {}) {
    this.namespace = options.namespace ?? "stellar_sdk";
    this.fallback = new MemoryCache();
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
      expiresAt: Date.now() + ttl * 1000,
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
