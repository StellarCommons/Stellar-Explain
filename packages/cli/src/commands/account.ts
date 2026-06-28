import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateAddress } from "../lib/validate.js";
import { formatAccount } from "../formatters/account.js";
import { getCached, setCache } from "../lib/cache.js";
import { shouldUseColorOutput } from "../lib/config.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export function registerAccount(program: Command): void {
  program
    .command("account <address>")
    .description("Explain a Stellar account")
    .action(async (address: string) => {
      const opts = program.opts<{ url: string; timeout: number; retries: number; verbose: boolean; json: boolean; cache: boolean; color: boolean }>();
      validateAddress(address);

      if (opts.cache !== false) {
        const cached = getCached<ReturnType<typeof formatAccount>>(address, CACHE_TTL_MS);
        if (cached) {
          console.log(opts.json ? JSON.stringify(cached, null, 2) : cached);
          return;
        }
      }

      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, retries: opts.retries, verbose: opts.verbose });
      const acc = await client.getAccount(address);
      const useColor = shouldUseColorOutput({ noColor: opts.color === false }) && !opts.json;
      const output = opts.json ? JSON.stringify(acc, null, 2) : formatAccount(acc, useColor);
      console.log(output);

      if (opts.cache !== false) {
        setCache(address, acc);
      }
    });
}
