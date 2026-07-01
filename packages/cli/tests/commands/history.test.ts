/**
 * Tests for the history command (issue #577).
 *
 * Covers:
 *  - listing entries
 *  - filtering by kind (--kind tx | account)
 *  - applying --limit
 *  - empty history output
 *  - `history clear` subcommand
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Command } from "commander";

// ─── Temp dir for isolation ────────────────────────────────────────────────────
const TEMP_HOME = path.join(
  os.tmpdir(),
  `se-history-cmd-test-${process.pid}`,
);
const HISTORY_FILE = path.join(TEMP_HOME, "history.json");

// ─── Mock history lib to use temp dir ─────────────────────────────────────────
vi.mock("../../src/lib/history.js", () => {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const os = require("os") as typeof import("os");

  const TEMP = path.join(
    os.tmpdir(),
    `se-history-cmd-test-${process.pid}`,
  );
  const FILE = path.join(TEMP, "history.json");

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
    fs.writeFileSync(FILE, JSON.stringify(entries, null, 2), "utf8");
  }

  function clearHistory(): void {
    if (fs.existsSync(FILE)) fs.rmSync(FILE);
  }

  function historyFilePath(): string {
    return FILE;
  }

  return { readHistory, addEntry, clearHistory, historyFilePath };
});

import { registerHistoryCommand } from "../../src/commands/history.js";
import {
  addEntry,
  clearHistory,
  readHistory,
} from "../../src/lib/history.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProgram() {
  const program = new Command();
  program.exitOverride(); // prevent process.exit in tests
  registerHistoryCommand(program);
  return program;
}

/** Capture console.log output while running a callback. */
async function captureLog(fn: () => void | Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
  await fn();
  spy.mockRestore();
  return lines;
}

/** Capture console.error output while running a callback. */
async function captureError(fn: () => void | Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
  await fn();
  spy.mockRestore();
  return lines;
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  fs.mkdirSync(TEMP_HOME, { recursive: true });
  clearHistory();
});

afterEach(() => {
  clearHistory();
  fs.rmSync(TEMP_HOME, { recursive: true, force: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("history command", () => {
  // ── Empty history ──────────────────────────────────────────────────────────

  describe("empty history", () => {
    it('prints "No history found." when no entries exist', async () => {
      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history"], { from: "user" });
      });
      expect(lines.join("\n")).toContain("No history found.");
    });
  });

  // ── Listing entries ────────────────────────────────────────────────────────

  describe("listing entries", () => {
    it("shows all entries by default", async () => {
      const txHash = "a".repeat(64);
      const acctId = "G" + "B".repeat(55);
      addEntry("tx", txHash);
      addEntry("account", acctId);

      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toContain(txHash);
      expect(output).toContain(acctId);
    });

    it("shows a summary line at the end", async () => {
      addEntry("tx", "a".repeat(64));

      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toMatch(/1 entr(y|ies) shown/);
    });

    it("includes the history file path in summary", async () => {
      addEntry("tx", "a".repeat(64));

      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toContain(HISTORY_FILE);
    });
  });

  // ── Filtering by kind ──────────────────────────────────────────────────────

  describe("--kind filtering", () => {
    beforeEach(() => {
      addEntry("tx", "a".repeat(64));
      addEntry("account", "G" + "C".repeat(55));
      addEntry("tx", "b".repeat(64));
    });

    it("--kind tx shows only tx entries", async () => {
      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history", "--kind", "tx"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toContain("tx");
      expect(output).not.toContain("G" + "C".repeat(55));
      expect(output).toMatch(/2 entr/);
    });

    it("--kind account shows only account entries", async () => {
      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history", "--kind", "account"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toContain("G" + "C".repeat(55));
      expect(output).not.toContain("a".repeat(64));
      expect(output).toMatch(/1 entry/);
    });

    it("unknown kind exits with error", async () => {
      const program = makeProgram();
      const errLines = await captureError(() => {
        try {
          program.parse(["history", "--kind", "invalid"], { from: "user" });
        } catch {
          // process.exit is thrown as an error via exitOverride
        }
      });

      expect(errLines.join("\n")).toMatch(/unknown kind/i);
    });
  });

  // ── --limit option ─────────────────────────────────────────────────────────

  describe("--limit option", () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        addEntry("tx", i.toString(16).padStart(64, "0"));
      }
    });

    it("--limit 3 shows only the 3 most recent entries", async () => {
      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history", "--limit", "3"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toMatch(/3 entr/);
    });

    it("--limit 1 shows only the most recent entry", async () => {
      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history", "--limit", "1"], { from: "user" });
      });

      const output = lines.join("\n");
      expect(output).toMatch(/1 entry/);
    });
  });

  // ── history clear subcommand ───────────────────────────────────────────────

  describe("history clear", () => {
    it("removes the history file", async () => {
      addEntry("tx", "a".repeat(64));
      expect(readHistory()).toHaveLength(1);

      const program = makeProgram();
      await captureLog(() => {
        program.parse(["history", "clear"], { from: "user" });
      });

      expect(readHistory()).toHaveLength(0);
      expect(fs.existsSync(HISTORY_FILE)).toBe(false);
    });

    it("prints a confirmation message", async () => {
      addEntry("tx", "a".repeat(64));

      const program = makeProgram();
      const lines = await captureLog(() => {
        program.parse(["history", "clear"], { from: "user" });
      });

      expect(lines.join("\n")).toMatch(/history cleared/i);
    });

    it("is safe to call with no history file", async () => {
      const program = makeProgram();
      await expect(
        captureLog(() => {
          program.parse(["history", "clear"], { from: "user" });
        }),
      ).resolves.not.toThrow();
    });
  });
});
