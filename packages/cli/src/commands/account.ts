import type { Command } from "commander";
import ora from "ora";
import { createClient } from "../lib/client.js";
import { validateAddress } from "../lib/validate.js";
import { isTTY } from "../lib/config.js";
import { formatAccount } from "../formatters/account.js";

export function registerAccount(program: Command): void {
  program
    .command("account <address>")
    .description("Explain a Stellar account")
    .action(async (address: string) => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      validateAddress(address);
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const spinner = ora({ text: "Fetching account…", isSilent: !isTTY }).start();
      try {
        const acc = await client.getAccount(address);
        spinner.stop();
        console.log(opts.json ? JSON.stringify(acc, null, 2) : formatAccount(acc));
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });
}
