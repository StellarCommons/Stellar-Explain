import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { formatHealth } from "../formatters/health.js";
import { shouldUseColorOutput } from "../lib/config.js";

export function registerHealth(program: Command): void {
  program
    .command("health")
    .description("Check API health status")
    .action(async () => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const h = await client.getHealth();
      if (opts.json) { console.log(JSON.stringify(h, null, 2)); return; }
      console.log(formatHealth(h, shouldUseColorOutput()));
    });
}
