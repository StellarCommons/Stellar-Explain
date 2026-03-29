import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryCache } from "../src/cache/MemoryCache.js";

describe("MemoryCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("set then get within TTL returns value", () => {
    const cache = new MemoryCache(1000);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("get after TTL expires returns null", () => {
    const cache = new MemoryCache(1000);
    cache.set("k", "v");
    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeNull();
  });

  it("set with ttl=0 makes get immediately return null", () => {
    const cache = new MemoryCache(0);
    cache.set("k", "v");
    expect(cache.get("k")).toBeNull();
  });

  it("set with ttlOverride overrides instance TTL", () => {
    const cache = new MemoryCache(1000);
    cache.set("k", "v", 5000);
    vi.advanceTimersByTime(2000);
    expect(cache.get("k")).toBe("v");
  });

  it("delete removes a key", () => {
    const cache = new MemoryCache(1000);
    cache.set("k", "v");
    cache.delete("k");
    expect(cache.get("k")).toBeNull();
  });

  it("clear empties the store and size becomes 0", () => {
    const cache = new MemoryCache(1000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("size reflects current number of entries", () => {
    const cache = new MemoryCache(1000);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });
});
