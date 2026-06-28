import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { detectInputType } from "../lib/autoDetect.js";
import { validateHash, validateAddress } from "../lib/validate.js";
import { formatTransaction } from "../formatters/transaction.js";
import { formatAccount } from "../formatters/account.js";
import { getCached, setCache } from "../lib/cache.js";
import { shouldUseColorOutput } from "../lib/config.js";
import { InvalidInputError } from "../lib/errors.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export function registerExplain(program: Command): void {
  program
    .command("explain <input>")
    .description("Auto-detect and explain a transaction hash or account address")
    .action(async (input: string) => {
      const opts = program.opts<{
        url: string;
        timeout: number;
        retries: number;
        verbose: boolean;
        json: boolean;
        cache: boolean;
        color: boolean;
      }>();

      const type = detectInputType(input);
      if (type === "unknown") {
        throw new InvalidInputError(
          `Unable to auto-detect input type: ${input}. Provide a transaction hash (64 hex chars) or Stellar address (G...).`,
        );
      }

      if (opts.cache !== false) {
        const cached = getCached<unknown>(input, CACHE_TTL_MS);
        if (cached) {
          console.log(opts.json ? JSON.stringify(cached, null, 2) : cached);
          return;
        }
      }

      const client = createClient({
        baseUrl: opts.url,
        timeout: opts.timeout,
        retries: opts.retries ?? 0,
        verbose: opts.verbose,
      });

      const useColor = shouldUseColorOutput({ noColor: opts.color === false }) && !opts.json;

      if (type === "hash") {
        validateHash(input);
        const tx = await client.getTransaction(input);
        const output = opts.json ? JSON.stringify(tx, null, 2) : formatTransaction(tx, useColor);
        console.log(output);
        if (opts.cache !== false) setCache(input, tx);
      } else {
        validateAddress(input);
        const acc = await client.getAccount(input);
        const output = opts.json ? JSON.stringify(acc, null, 2) : formatAccount(acc, useColor);
        console.log(output);
        if (opts.cache !== false) setCache(input, acc);
      }
    });
}
