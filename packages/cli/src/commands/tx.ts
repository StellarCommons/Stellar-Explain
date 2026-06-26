import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import { formatTransaction } from "../formatters/transaction.js";
import { shouldUseColorOutput } from "../lib/config.js";

export function registerTx(program: Command): void {
  program
    .command("tx <hash>")
    .description("Explain a Stellar transaction")
    .option("--full-address", "Print full G-addresses instead of truncated form", false)
    .action(async (hash: string, cmdOpts: { fullAddress: boolean }) => {
      const opts = program.opts<{ url: string; timeout: number; retries: number; verbose: boolean; json: boolean }>();
      validateHash(hash);
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, retries: opts.retries, verbose: opts.verbose });
      const tx = await client.getTransaction(hash);
      const useColor = shouldUseColorOutput() && !opts.json;
      console.log(opts.json ? JSON.stringify(tx, null, 2) : formatTransaction(tx, useColor, cmdOpts.fullAddress));
    });
}
