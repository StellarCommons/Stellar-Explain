import fs from "fs";
import path from "path";
import readline from "readline";
import type { Command } from "commander";
import cliProgress from "cli-progress";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import { formatTransaction } from "../formatters/transaction.js";
import { InvalidInputError } from "../lib/errors.js";
import type { TransactionExplanation } from "../types/index.js";

interface BatchResult {
  hash: string;
  status: "ok" | "error";
  data?: TransactionExplanation;
  error?: string;
}

/** Read non-empty, non-comment lines from a file, one hash per line. */
async function readHashes(filePath: string): Promise<string[]> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new InvalidInputError(`File not found: ${resolved}`);
  }
  const rl = readline.createInterface({
    input: fs.createReadStream(resolved),
    crlfDelay: Infinity,
  });
  const hashes: string[] = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) hashes.push(trimmed);
  }
  if (hashes.length === 0) {
    throw new InvalidInputError(`No hashes found in file: ${resolved}`);
  }
  return hashes;
}

export function registerBatch(program: Command): void {
  program
    .command("batch <file>")
    .description("Explain multiple transaction hashes read from a file (one per line)")
    .option("--output <path>", "Write results to a JSON file instead of stdout")
    .option("--concurrency <n>", "Number of parallel requests", (v) => parseInt(v, 10), 3)
    .action(async (file: string, cmdOpts: { output?: string; concurrency: number }) => {
      const opts = program.opts<{
        url: string;
        timeout: number;
        verbose: boolean;
        retries: number;
        json: boolean;
        retries: number;
      }>();

      const hashes = await readHashes(file);
      const client = createClient({
        baseUrl: opts.url,
        timeout: opts.timeout,
        verbose: opts.verbose,
        retries: opts.retries ?? 0,
      });

      // Validate all hashes upfront so the user gets a clear error before any
      // network calls are made.
      for (const hash of hashes) {
        validateHash(hash);
      }

      const results: BatchResult[] = [];
      const toOutput = Boolean(cmdOpts.output);

      // Only show the progress bar when not piping to a file and not in
      // --json mode, so stdout stays clean for downstream consumers.
      const showBar = !toOutput && !opts.json;
      const bar = showBar
        ? new cliProgress.SingleBar(
            {
              format: "Processing [{bar}] {value}/{total} hashes | ETA: {eta}s",
              clearOnComplete: true,
            },
            cliProgress.Presets.shades_classic,
          )
        : null;

      bar?.start(hashes.length, 0);

      // Process in chunks of `concurrency` to bound parallelism.
      const concurrency = Math.max(1, cmdOpts.concurrency);
      for (let i = 0; i < hashes.length; i += concurrency) {
        const chunk = hashes.slice(i, i + concurrency);
        const settled = await Promise.allSettled(
          chunk.map((hash) => client.getTransaction(hash)),
        );
        for (let j = 0; j < chunk.length; j++) {
          const hash = chunk[j]!;
          const outcome = settled[j]!;
          if (outcome.status === "fulfilled") {
            results.push({ hash, status: "ok", data: outcome.value });
          } else {
            const msg =
              outcome.reason instanceof Error
                ? outcome.reason.message
                : String(outcome.reason);
            results.push({ hash, status: "error", error: msg });
          }
          bar?.increment();
        }
      }

      bar?.stop();

      // --output: write JSON file
      if (cmdOpts.output) {
        const outPath = path.resolve(cmdOpts.output);
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
        process.stdout.write(`Wrote ${results.length} results to ${outPath}\n`);
        return;
      }

      // --json: raw JSON to stdout
      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      // Default: human-readable output
      for (const result of results) {
        process.stdout.write(`\n— ${result.hash}\n`);
        if (result.status === "error") {
          process.stderr.write(`  Error: ${result.error}\n`);
        } else if (result.data !== undefined) {
          console.log(formatTransaction(result.data));
        }
      }
    });
}