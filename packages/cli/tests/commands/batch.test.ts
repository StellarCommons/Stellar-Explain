/**
 * Tests for the batch command (issue #578).
 *
 * Covers:
 *  - reading hashes from a file
 *  - dry-run mode (validates & lists without calling API)
 *  - invalid/missing file path
 *  - empty or comment-only files
 *  - writing results to an output file
 *  - human-readable stdout output
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Command } from "commander";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A valid 64-char hex transaction hash. */
function makeHash(n: number): string {
  return n.toString(16).padStart(64, "0");
}

// ─── Temp dir for isolation ────────────────────────────────────────────────────
const TEMP_DIR = path.join(os.tmpdir(), `se-batch-test-${process.pid}`);

function tmpFile(name: string): string {
  return path.join(TEMP_DIR, name);
}

// ─── Mock the API client so no real network calls are made ────────────────────
vi.mock("../../src/lib/client.js", () => ({
  createClient: () => ({
    getTransaction: async (hash: string) => ({
      hash,
      summary: `Summary for ${hash}`,
      status: "success",
      ledger: 50000000,
      created_at: "2024-01-01T00:00:00Z",
      fee_charged: "100",
      memo: null,
      payments: [],
      skipped_operations: 0,
    }),
  }),
}));

// ─── Setup/teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
});

// ─── Shared program builder ───────────────────────────────────────────────────

import { registerBatch } from "../../src/commands/batch.js";

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program
    .option("--url <url>", "API base URL", "https://stellar-explain-core.onrender.com")
    .option("--timeout <ms>", "timeout", (v) => parseInt(v, 10), 10000)
    .option("--retries <n>", "retries", (v) => parseInt(v, 10), 0)
    .option("--verbose", "verbose", false)
    .option("--json", "json output", false);
  registerBatch(program);
  return program;
}

/** Run a program command and capture stdout writes. */
async function captureStdout(
  fn: () => void | Promise<void>,
): Promise<string> {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    chunks.push(args.map(String).join(" ") + "\n");
  });
  try {
    await fn();
  } finally {
    spy.mockRestore();
    logSpy.mockRestore();
  }
  return chunks.join("");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("batch command", () => {
  // ── File reading ───────────────────────────────────────────────────────────

  describe("file reading", () => {
    it("reads hashes from a newline-separated file (dry-run)", async () => {
      const hash1 = makeHash(1);
      const hash2 = makeHash(2);
      const hashFile = tmpFile("hashes.txt");
      fs.writeFileSync(hashFile, `${hash1}\n${hash2}\n`, "utf8");

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile, "--dry-run"], { from: "user" }),
      );

      expect(out).toContain(hash1);
      expect(out).toContain(hash2);
    });

    it("ignores comment lines starting with #", async () => {
      const hash = makeHash(42);
      const hashFile = tmpFile("hashes.txt");
      fs.writeFileSync(
        hashFile,
        `# this is a comment\n${hash}\n# another comment\n`,
        "utf8",
      );

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile, "--dry-run"], { from: "user" }),
      );

      expect(out).toContain(hash);
      expect(out).not.toContain("# this is a comment");
    });

    it("ignores blank lines", async () => {
      const hash = makeHash(7);
      const hashFile = tmpFile("hashes.txt");
      fs.writeFileSync(hashFile, `\n${hash}\n\n`, "utf8");

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile, "--dry-run"], { from: "user" }),
      );

      expect(out).toContain(hash);
    });
  });

  // ── --dry-run mode ─────────────────────────────────────────────────────────

  describe("--dry-run mode", () => {
    it("reports how many hashes would be processed", async () => {
      const hashFile = tmpFile("hashes.txt");
      fs.writeFileSync(
        hashFile,
        [makeHash(1), makeHash(2), makeHash(3)].join("\n"),
        "utf8",
      );

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile, "--dry-run"], { from: "user" }),
      );

      expect(out).toContain("3");
    });

    it("lists each hash on its own line", async () => {
      const hashes = [makeHash(10), makeHash(11)];
      const hashFile = tmpFile("hashes.txt");
      fs.writeFileSync(hashFile, hashes.join("\n"), "utf8");

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile, "--dry-run"], { from: "user" }),
      );

      for (const h of hashes) {
        expect(out).toContain(h);
      }
    });
  });

  // ── Error: missing file ────────────────────────────────────────────────────

  describe("error handling", () => {
    it("throws when the input file does not exist", async () => {
      const program = makeProgram();
      await expect(
        program.parseAsync(["batch", tmpFile("missing.txt")], { from: "user" }),
      ).rejects.toThrow(/file not found/i);
    });

    it("throws when the file contains no valid hashes", async () => {
      const emptyFile = tmpFile("empty.txt");
      fs.writeFileSync(emptyFile, "# only comments\n\n", "utf8");

      const program = makeProgram();
      await expect(
        program.parseAsync(["batch", emptyFile], { from: "user" }),
      ).rejects.toThrow(/no hashes found/i);
    });

    it("throws for an invalid transaction hash", async () => {
      const badFile = tmpFile("bad.txt");
      fs.writeFileSync(badFile, "not-a-valid-hash\n", "utf8");

      const program = makeProgram();
      await expect(
        program.parseAsync(["batch", badFile], { from: "user" }),
      ).rejects.toThrow();
    });
  });

  // ── --output file ──────────────────────────────────────────────────────────

  describe("--output flag", () => {
    it("writes JSON results to the output file", async () => {
      const hash = makeHash(99);
      const hashFile = tmpFile("in.txt");
      const outFile = tmpFile("out.json");
      fs.writeFileSync(hashFile, hash, "utf8");

      const program = makeProgram();
      await program.parseAsync(
        ["batch", hashFile, "--output", outFile],
        { from: "user" },
      );

      expect(fs.existsSync(outFile)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outFile, "utf8")) as Array<{
        hash: string;
        status: string;
      }>;
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.hash).toBe(hash);
      expect(parsed[0]!.status).toBe("ok");
    });
  });

  // ── Successful execution (human-readable) ──────────────────────────────────

  describe("successful execution", () => {
    it("outputs a result for each hash", async () => {
      const hashes = [makeHash(101), makeHash(102)];
      const hashFile = tmpFile("two.txt");
      fs.writeFileSync(hashFile, hashes.join("\n"), "utf8");

      const program = makeProgram();
      const out = await captureStdout(() =>
        program.parseAsync(["batch", hashFile], { from: "user" }),
      );

      expect(out).toContain(hashes[0]);
      expect(out).toContain(hashes[1]);
    });
  });
});
