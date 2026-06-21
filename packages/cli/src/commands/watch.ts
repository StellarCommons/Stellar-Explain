import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import { formatTransaction } from "../formatters/transaction.js";

const DEFAULT_INTERVAL_MS = 4_000;
const DEFAULT_TIMEOUT_MS  = 120_000;

export function registerWatch(program: Command): void {
  program
    .command("watch <hash>")
    .description("Poll a transaction until it reaches 'success' or 'failed' status")
    .option(
      "--interval <ms>",
      "Polling interval in milliseconds",
      (v) => parseInt(v, 10),
      DEFAULT_INTERVAL_MS,
    )
    .option(
      "--watch-timeout <ms>",
      "Maximum total time to wait in milliseconds",
      (v) => parseInt(v, 10),
      DEFAULT_TIMEOUT_MS,
    )
    .action(
      async (hash: string, cmdOpts: { interval: number; watchTimeout: number }) => {
        const opts = program.opts<{
          url: string;
          timeout: number;
          retries: number;
          verbose: boolean;
          retries: number;
          json: boolean;
          retries: number;
        }>();

        validateHash(hash);

        const client = createClient({
          baseUrl:  opts.url,
          timeout:  opts.timeout,
          verbose:  opts.verbose,
          retries:  opts.retries ?? 0,
        });

        const intervalMs     = Math.max(500, cmdOpts.interval);
        const watchTimeoutMs = Math.max(intervalMs * 2, cmdOpts.watchTimeout);
        const deadline       = Date.now() + watchTimeoutMs;
        let   attempt        = 0;

        process.stderr.write(
          `Watching ${hash} (interval ${intervalMs}ms, timeout ${watchTimeoutMs}ms)…\n`,
        );

        while (Date.now() < deadline) {
          attempt++;
          try {
            const tx = await client.getTransaction(hash);

            // Normalise: the status field may sit at the top level or inside
            // a nested `result` object depending on the API version.
            // Cast through unknown so TypeScript allows the index access on a
            // typed struct without requiring an index signature on the type.
            const txRecord = tx as unknown as Record<string, unknown>;
            const status: string | undefined =
              txRecord["status"] as string | undefined ??
              (txRecord["result"] as Record<string, unknown> | undefined)?.[
                "status"
              ] as string | undefined;

            const terminal = status === "success" || status === "failed";

            if (!opts.json) {
              process.stderr.write(
                `  [${attempt}] status: ${status ?? "unknown"}${terminal ? " ✓" : ""}\n`,
              );
            }

            if (terminal) {
              console.log(opts.json ? JSON.stringify(tx, null, 2) : formatTransaction(tx));
              return;
            }
          } catch (err) {
            // Non-fatal: network hiccup or 404 while the tx propagates.
            const msg = err instanceof Error ? err.message : String(err);
            process.stderr.write(`  [${attempt}] fetch error: ${msg}\n`);
          }

          await sleep(intervalMs);
        }

        process.stderr.write(
          `Error: timed out after ${watchTimeoutMs}ms waiting for ${hash}\n`,
        );
        process.exit(1);
      },
    );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}