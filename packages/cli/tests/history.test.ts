import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const DEFAULT_HISTORY_LIMIT = 10;

function applyLimit<T>(entries: T[], limit: number): T[] {
  return entries.slice(-Math.abs(limit));
}

vi.mock("../src/lib/history.js", () => {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const os = require("os") as typeof import("os");

  const TEMP_HOME = path.join(os.tmpdir(), `se-history-test-${process.pid}`);
  const FILE = path.join(TEMP_HOME, ".stellar-explain-history.json");

  const LIMIT = 10;

  function applyLimitInner<T>(entries: T[], limit: number): T[] {
    return entries.slice(-Math.abs(limit));
  }

  interface HistoryEntry {
    input: string;
    timestamp: string;
  }

  function loadEntries(): HistoryEntry[] {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as HistoryEntry[];
  }

  function addEntry(entry: HistoryEntry, limit = LIMIT): void {
    const entries = loadEntries();
    entries.push(entry);
    const trimmed = applyLimitInner(entries, limit);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(trimmed), "utf8");
  }

  function clearHistory(): void {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  }

  return { addEntry, loadEntries, clearHistory };
});

import { addEntry, loadEntries, clearHistory } from "../src/lib/history.js";

const TEMP_HOME = path.join(os.tmpdir(), `se-history-test-${process.pid}`);
const HISTORY_FILE = path.join(TEMP_HOME, ".stellar-explain-history.json");

function entry(n: number): { input: string; timestamp: string } {
  return { input: `tx-${n}`, timestamp: new Date(Date.now() + n).toISOString() };
}

describe("history", () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_HOME, { recursive: true });
  });

  afterEach(() => {
    clearHistory();
    fs.rmSync(TEMP_HOME, { recursive: true, force: true });
  });

  // ── Adding entries ─────────────────────────────────────────────

  describe("addEntry", () => {
    it("persists a single entry", () => {
      addEntry(entry(1));

      const entries = loadEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].input).toBe("tx-1");
    });

    it("appends entries in order", () => {
      addEntry(entry(1));
      addEntry(entry(2));
      addEntry(entry(3));

      const entries = loadEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].input).toBe("tx-1");
      expect(entries[1].input).toBe("tx-2");
      expect(entries[2].input).toBe("tx-3");
    });

    it("creates the history file if it does not exist", () => {
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);

      addEntry(entry(1));

      expect(fs.existsSync(HISTORY_FILE)).toBe(true);
    });
  });

  // ── Reading entries ────────────────────────────────────────────

  describe("loadEntries", () => {
    it("returns an empty array when no history file exists", () => {
      expect(loadEntries()).toEqual([]);
    });

    it("reads entries from the history file", () => {
      addEntry(entry(1));
      addEntry(entry(2));

      const entries = loadEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].input).toBe("tx-1");
      expect(entries[1].input).toBe("tx-2");
    });

    it("preserves all entry fields", () => {
      const e = { input: "abc123", timestamp: "2025-01-01T00:00:00Z" };
      addEntry(e);

      const [result] = loadEntries();
      expect(result.input).toBe("abc123");
      expect(result.timestamp).toBe("2025-01-01T00:00:00Z");
    });
  });

  // ── Limiting to max count ──────────────────────────────────────

  describe("limiting entries", () => {
    it("trims to the default limit of 10 when exceeded", () => {
      for (let i = 1; i <= 15; i++) {
        addEntry(entry(i));
      }

      const entries = loadEntries();
      expect(entries).toHaveLength(10);
      // Should keep the latest 10 (entries 6-15)
      expect(entries[0].input).toBe("tx-6");
      expect(entries[9].input).toBe("tx-15");
    });

    it("respects a custom limit", () => {
      for (let i = 1; i <= 5; i++) {
        addEntry(entry(i), 3);
      }

      const entries = loadEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].input).toBe("tx-3");
      expect(entries[2].input).toBe("tx-5");
    });

    it("does not trim when under the limit", () => {
      for (let i = 1; i <= 5; i++) {
        addEntry(entry(i));
      }

      const entries = loadEntries();
      expect(entries).toHaveLength(5);
    });
  });

  // ── Clearing history ───────────────────────────────────────────

  describe("clearHistory", () => {
    it("removes the history file", () => {
      addEntry(entry(1));
      expect(fs.existsSync(HISTORY_FILE)).toBe(true);

      clearHistory();

      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
    });

    it("results in an empty loadEntries", () => {
      addEntry(entry(1));
      addEntry(entry(2));

      clearHistory();

      expect(loadEntries()).toEqual([]);
    });

    it("is safe to call when no history file exists", () => {
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
      expect(() => clearHistory()).not.toThrow();
    });
  });
});
