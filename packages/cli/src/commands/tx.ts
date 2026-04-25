import type { Command } from "commander";
import ora from "ora";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import { isTTY } from "../lib/config.js";
import { formatTransaction } from "../formatters/transaction.js";

export function registerTx(program: Command): void {
  program
    .command("tx <hash>")
    .description("Explain a Stellar transaction")
    .action(async (hash: string) => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      validateHash(hash);
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const spinner = ora({ text: "Fetching transaction…", isSilent: !isTTY }).start();
      try {
        const tx = await client.getTransaction(hash);
        spinner.stop();
        console.log(opts.json ? JSON.stringify(tx, null, 2) : formatTransaction(tx));
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });
}
