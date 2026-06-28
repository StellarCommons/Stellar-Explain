import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import { formatTransaction } from "../formatters/transaction.js";
import { getCached, setCache } from "../lib/cache.js";
import { shouldUseColorOutput } from "../lib/config.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export function registerTx(program: Command): void {
  program
    .command("tx <hash>")
    .description("Explain a Stellar transaction")
    .action(async (hash: string) => {
      const opts = program.opts<{ url: string; timeout: number; retries: number; verbose: boolean; json: boolean; cache: boolean; color: boolean }>();
      validateHash(hash);

      if (opts.cache !== false) {
        const cached = getCached<ReturnType<typeof formatTransaction>>(hash, CACHE_TTL_MS);
        if (cached) {
          console.log(opts.json ? JSON.stringify(cached, null, 2) : cached);
          return;
        }
      }

      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, retries: opts.retries, verbose: opts.verbose });
      const tx = await client.getTransaction(hash);
      const useColor = shouldUseColorOutput({ noColor: opts.color === false }) && !opts.json;
      const output = opts.json ? JSON.stringify(tx, null, 2) : formatTransaction(tx, useColor);
      console.log(output);

      if (opts.cache !== false) {
        setCache(hash, tx);
      }
    });
}
