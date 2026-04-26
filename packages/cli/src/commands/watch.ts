import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";

export function registerWatch(program: Command): void {
  program
    .command("watch <hash>")
    .description("Poll a transaction hash until confirmed")
    .option("--interval <ms>", "Polling interval in ms", (v) => parseInt(v, 10), 3000)
    .option("--watch-timeout <ms>", "Stop polling after N ms", (v) => parseInt(v, 10), 60000)
    .action(async (hash: string, cmdOpts: { interval: number; watchTimeout: number }) => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      validateHash(hash);
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const deadline = Date.now() + cmdOpts.watchTimeout;
      while (Date.now() < deadline) {
        const tx = await client.getTransaction(hash);
        if (opts.json) { console.log(JSON.stringify(tx, null, 2)); break; }
        console.log(tx);
        break;
      }
    });
}