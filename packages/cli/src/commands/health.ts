import type { Command } from "commander";
import ora from "ora";
import { createClient } from "../lib/client.js";
import { isTTY } from "../lib/config.js";
import { formatHealth } from "../formatters/health.js";

export function registerHealth(program: Command): void {
  program
    .command("health")
    .description("Check API health status")
    .action(async () => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const spinner = ora({ text: "Checking health…", isSilent: !isTTY }).start();
      try {
        const h = await client.getHealth();
        spinner.stop();
        console.log(opts.json ? JSON.stringify(h, null, 2) : formatHealth(h));
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });
}
