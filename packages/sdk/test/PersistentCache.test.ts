import test from "node:test";
import assert from "node:assert/strict";

import { PersistentCache } from "../src/cache/PersistentCache.ts";

class MockStorage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

async function withLocalStorage(
  value: MockStorage | undefined,
  run: () => void | Promise<void>
): Promise<void> {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  if (value === undefined) {
    Reflect.deleteProperty(globalThis, "localStorage");
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value,
    });
  }

  const restore = () => {
    if (original) {
      Object.defineProperty(globalThis, "localStorage", original);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  };

  try {
    await run();
  } finally {
    restore();
  }
}

test("falls back to memory when localStorage is unavailable", () =>
  withLocalStorage(undefined, () => {
    const cache = new PersistentCache();

    assert.equal(cache.isUsingFallback, true);
  }));

test("warns only once per instance when fallback is activated", () =>
  withLocalStorage(undefined, () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };

    try {
      const cache = new PersistentCache();

      cache.set("tx:1", { summary: "Sent 1 XLM" });
      cache.get("tx:1");
      cache.delete("tx:1");
      cache.clear();

      assert.equal(warnings.length, 1);
      assert.match(warnings[0] ?? "", /PersistentCache is using MemoryCache/);
    } finally {
      console.warn = originalWarn;
    }
  }));

test("cache methods work through the fallback memory cache", () =>
  withLocalStorage(undefined, () => {
    const cache = new PersistentCache();

    cache.set("tx:2", { summary: "Sent 2 XLM", successful: true });
    assert.deepEqual(cache.get("tx:2"), {
      summary: "Sent 2 XLM",
      successful: true,
    });

    cache.delete("tx:2");
    assert.equal(cache.get("tx:2"), undefined);

    cache.set("tx:3", { summary: "Sent 3 XLM" });
    cache.clear();
    assert.equal(cache.get("tx:3"), undefined);
  }));

test("uses localStorage when available", () =>
  withLocalStorage(new MockStorage(), () => {
    const cache = new PersistentCache("test-cache");

    cache.set("tx:4", { summary: "Sent 4 XLM" });

    assert.equal(cache.isUsingFallback, false);
    assert.deepEqual(cache.get("tx:4"), { summary: "Sent 4 XLM" });

    cache.delete("tx:4");
    assert.equal(cache.get("tx:4"), undefined);
  }));
