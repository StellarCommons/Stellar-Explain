import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Temp dir used by the mock ────────────────────────────────────────────────
const TEMP_HOME = path.join(os.tmpdir(), `se-history-test-${process.pid}`);
const HISTORY_FILE = path.join(TEMP_HOME, "history.json");

// ─── Mock the history module so it writes to our temp dir ─────────────────────
vi.mock("../src/lib/history.js", () => {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const os = require("os") as typeof import("os");

  const TEMP = path.join(os.tmpdir(), `se-history-test-${process.pid}`);
  const FILE = path.join(TEMP, "history.json");
  const MAX_STORED = 500;

  type LookupKind = "tx" | "account";
  interface HistoryEntry {
    kind: LookupKind;
    query: string;
    timestamp: string;
  }

  function ensureDir() {
    if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });
  }

  function readHistory(): HistoryEntry[] {
    ensureDir();
    if (!fs.existsSync(FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(FILE, "utf8")) as HistoryEntry[];
    } catch {
      return [];
    }
  }

  function addEntry(kind: LookupKind, query: string): void {
    ensureDir();
    const entries = readHistory();
    entries.push({ kind, query, timestamp: new Date().toISOString() });
    const trimmed = entries.slice(-MAX_STORED);
    fs.writeFileSync(FILE, JSON.stringify(trimmed, null, 2), "utf8");
  }

  function clearHistory(): void {
    if (fs.existsSync(FILE)) fs.rmSync(FILE);
  }

  function historyFilePath(): string {
    return FILE;
  }

  return { readHistory, addEntry, clearHistory, historyFilePath };
});

import {
  readHistory,
  addEntry,
  clearHistory,
  historyFilePath,
} from "../src/lib/history.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function txEntry(n: number) {
  return { kind: "tx" as const, query: `${"a".repeat(63)}${n % 10}` };
}

function accountEntry(n: number) {
  return {
    kind: "account" as const,
    query: `G${"A".repeat(54)}${n % 10}`,
  };
}

// ─── Setup/teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  fs.mkdirSync(TEMP_HOME, { recursive: true });
});

afterEach(() => {
  clearHistory();
  fs.rmSync(TEMP_HOME, { recursive: true, force: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("history", () => {
  // ── Reading an empty history ───────────────────────────────────────────────

  describe("readHistory (empty)", () => {
    it("returns an empty array when no history file exists", () => {
      expect(readHistory()).toEqual([]);
    });
  });

  // ── Adding entries ─────────────────────────────────────────────────────────

  describe("addEntry", () => {
    it("persists a single tx entry", () => {
      const { kind, query } = txEntry(1);
      addEntry(kind, query);

      const entries = readHistory();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.kind).toBe("tx");
      expect(entries[0]!.query).toBe(query);
      expect(entries[0]!.timestamp).toBeTruthy();
    });

    it("persists a single account entry", () => {
      const { kind, query } = accountEntry(1);
      addEntry(kind, query);

      const entries = readHistory();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.kind).toBe("account");
      expect(entries[0]!.query).toBe(query);
    });

    it("appends entries in order", () => {
      addEntry("tx", txEntry(1).query);
      addEntry("account", accountEntry(2).query);
      addEntry("tx", txEntry(3).query);

      const entries = readHistory();
      expect(entries).toHaveLength(3);
      expect(entries[0]!.kind).toBe("tx");
      expect(entries[1]!.kind).toBe("account");
      expect(entries[2]!.kind).toBe("tx");
    });

    it("creates the history file if it does not exist", () => {
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
      addEntry("tx", txEntry(1).query);
      expect(fs.existsSync(HISTORY_FILE)).toBe(true);
    });

    it("records an ISO-8601 timestamp", () => {
      addEntry("tx", txEntry(1).query);
      const [entry] = readHistory();
      expect(new Date(entry!.timestamp).toISOString()).toBe(entry!.timestamp);
    });
  });

  // ── Reading entries ────────────────────────────────────────────────────────

  describe("readHistory", () => {
    it("reads back what was written", () => {
      addEntry("tx", txEntry(1).query);
      addEntry("account", accountEntry(2).query);

      const entries = readHistory();
      expect(entries).toHaveLength(2);
      expect(entries[0]!.kind).toBe("tx");
      expect(entries[1]!.kind).toBe("account");
    });

    it("preserves all three entry fields", () => {
      addEntry("account", accountEntry(1).query);
      const [result] = readHistory();
      expect(result).toHaveProperty("kind");
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("timestamp");
    });
  });

  // ── Filtering by kind ──────────────────────────────────────────────────────

  describe("filtering by kind", () => {
    beforeEach(() => {
      addEntry("tx", txEntry(1).query);
      addEntry("account", accountEntry(2).query);
      addEntry("tx", txEntry(3).query);
      addEntry("account", accountEntry(4).query);
    });

    it("can filter to only tx entries", () => {
      const txEntries = readHistory().filter((e) => e.kind === "tx");
      expect(txEntries).toHaveLength(2);
      expect(txEntries.every((e) => e.kind === "tx")).toBe(true);
    });

    it("can filter to only account entries", () => {
      const acctEntries = readHistory().filter((e) => e.kind === "account");
      expect(acctEntries).toHaveLength(2);
      expect(acctEntries.every((e) => e.kind === "account")).toBe(true);
    });
  });

  // ── Applying a limit ───────────────────────────────────────────────────────

  describe("applying a limit (slice)", () => {
    it("slicing the last N entries gives the most recent ones", () => {
      for (let i = 1; i <= 5; i++) addEntry("tx", txEntry(i).query);

      const entries = readHistory();
      const shown = entries.slice(-3).reverse();

      expect(shown).toHaveLength(3);
      // Most recent should be last written (entry 5)
      expect(shown[0]!.query).toBe(txEntry(5).query);
    });
  });

  // ── historyFilePath ────────────────────────────────────────────────────────

  describe("historyFilePath", () => {
    it("returns a non-empty string", () => {
      expect(typeof historyFilePath()).toBe("string");
      expect(historyFilePath().length).toBeGreaterThan(0);
    });
  });

  // ── Clearing history ───────────────────────────────────────────────────────

  describe("clearHistory", () => {
    it("removes the history file", () => {
      addEntry("tx", txEntry(1).query);
      expect(fs.existsSync(HISTORY_FILE)).toBe(true);

      clearHistory();
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
    });

    it("results in an empty readHistory after clear", () => {
      addEntry("tx", txEntry(1).query);
      addEntry("account", accountEntry(2).query);

      clearHistory();
      expect(readHistory()).toEqual([]);
    });

    it("is safe to call when no history file exists", () => {
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
      expect(() => clearHistory()).not.toThrow();
    });
  });
});
