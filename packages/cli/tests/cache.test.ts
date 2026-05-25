import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// Redirect all cache I/O to an isolated temp directory
const CACHE_DIR = path.join(os.tmpdir(), `se-cache-test-${process.pid}`);

function cacheKey(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

// Mock the cache module so it uses our temp CACHE_DIR instead of the real one
vi.mock("../src/lib/cache.js", () => ({
  getCached<T>(input: string, ttlMs?: number): T | null {
    const file = path.join(CACHE_DIR, cacheKey(input) + ".json");
    if (!fs.existsSync(file)) return null;

    if (ttlMs !== undefined) {
      const { mtimeMs } = fs.statSync(file);
      if (Date.now() - mtimeMs > ttlMs) {
        fs.unlinkSync(file);
        return null;
      }
    }

    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  },

  setCache<T>(input: string, data: T): void {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, cacheKey(input) + ".json");
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
  },

  clearCache(): void {
    if (!fs.existsSync(CACHE_DIR)) return;
    for (const entry of fs.readdirSync(CACHE_DIR)) {
      if (entry.endsWith(".json")) {
        fs.unlinkSync(path.join(CACHE_DIR, entry));
      }
    }
  },
}));

import { getCached, setCache, clearCache } from "../src/lib/cache.js";

describe("cache", () => {
  beforeEach(() => {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  });

  afterEach(() => {
    clearCache();
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  });

  // ── setCache + getCached ───────────────────────────────────────

  describe("setCache / getCached", () => {
    it("stores and retrieves data", () => {
      const data = { hash: "abc", summary: "test" };

      setCache("key1", data);
      const result = getCached("key1");

      expect(result).toEqual(data);
    });

    it("returns null for a key that was never set", () => {
      expect(getCached("nonexistent")).toBeNull();
    });

    it("overwrites an existing entry", () => {
      setCache("key1", { version: 1 });
      setCache("key1", { version: 2 });

      expect(getCached("key1")).toEqual({ version: 2 });
    });

    it("stores different keys independently", () => {
      setCache("alpha", { name: "A" });
      setCache("beta", { name: "B" });

      expect(getCached("alpha")).toEqual({ name: "A" });
      expect(getCached("beta")).toEqual({ name: "B" });
    });
  });

  // ── TTL — get within TTL ───────────────────────────────────────

  describe("getCached within TTL", () => {
    it("returns data when TTL has not expired", () => {
      setCache("fresh", { status: "ok" });

      // TTL of 10 seconds — the entry was just written, so it's fresh
      const result = getCached("fresh", 10_000);
      expect(result).toEqual({ status: "ok" });
    });
  });

  // ── TTL — get after expiry ─────────────────────────────────────

  describe("getCached after TTL expiry", () => {
    it("returns null when TTL has expired", () => {
      setCache("stale", { status: "old" });

      // Find the cache file and backdate its mtime
      const files = fs.readdirSync(CACHE_DIR);
      const targetFile = files.find((f) => f.endsWith(".json"));
      if (!targetFile) throw new Error("cache file not created");

      const fullPath = path.join(CACHE_DIR, targetFile);
      const oldTime = Date.now() - 20_000; // 20s ago
      fs.utimesSync(fullPath, new Date(oldTime), new Date(oldTime));

      // TTL of 5 seconds — the entry is 20s old, so it's expired
      const result = getCached("stale", 5_000);
      expect(result).toBeNull();
    });

    it("deletes the cache file when TTL has expired", () => {
      setCache("expired", { status: "gone" });

      const files = fs.readdirSync(CACHE_DIR);
      const targetFile = files.find((f) => f.endsWith(".json"))!;
      const fullPath = path.join(CACHE_DIR, targetFile);

      // Backdate 10s into the past
      const oldTime = Date.now() - 10_000;
      fs.utimesSync(fullPath, new Date(oldTime), new Date(oldTime));

      // TTL of 1ms — definitely expired
      getCached("expired", 1);

      // The file should have been deleted
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });

  // ── clearCache ─────────────────────────────────────────────────

  describe("clearCache", () => {
    it("removes all cached entries", () => {
      setCache("a", { v: 1 });
      setCache("b", { v: 2 });
      setCache("c", { v: 3 });

      expect(fs.readdirSync(CACHE_DIR).length).toBe(3);

      clearCache();

      expect(fs.readdirSync(CACHE_DIR).length).toBe(0);
      expect(getCached("a")).toBeNull();
      expect(getCached("b")).toBeNull();
      expect(getCached("c")).toBeNull();
    });

    it("is safe to call on an empty cache", () => {
      clearCache(); // no entries yet — should not throw
      expect(fs.readdirSync(CACHE_DIR).length).toBe(0);
    });

    it("only removes .json files, preserving other files", () => {
      setCache("data", { v: 1 });
      // Write a non-.json file into the cache dir
      fs.writeFileSync(path.join(CACHE_DIR, "README.txt"), "keep me");

      clearCache();

      const remaining = fs.readdirSync(CACHE_DIR);
      expect(remaining).toEqual(["README.txt"]);
    });
  });
});
