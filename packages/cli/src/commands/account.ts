import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateAddress } from "../lib/validate.js";
import { formatAccount } from "../formatters/account.js";
import { shouldUseColorOutput } from "../lib/config.js";

export function registerAccount(program: Command): void {
  program
    .command("account <address>")
    .description("Explain a Stellar account")
    .option("--full-address", "Print full G-addresses instead of truncated form", false)
    .action(async (address: string, cmdOpts: { fullAddress: boolean }) => {
      const opts = program.opts<{ url: string; timeout: number; retries: number; verbose: boolean; json: boolean }>();
      validateAddress(address);
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, retries: opts.retries, verbose: opts.verbose });
      const acc = await client.getAccount(address);
      const useColor = shouldUseColorOutput() && !opts.json;
      console.log(opts.json ? JSON.stringify(acc, null, 2) : formatAccount(acc, useColor, cmdOpts.fullAddress));
    });
}
