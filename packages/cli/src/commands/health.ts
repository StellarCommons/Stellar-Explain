import type { Command } from "commander";
import { createClient } from "../lib/client.js";

export function registerHealth(program: Command): void {
  program
    .command("health")
    .description("Check API health status")
    .action(async () => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const h = await client.getHealth();
      if (opts.json) { console.log(JSON.stringify(h, null, 2)); return; }
      console.log(`Status:   ${h.status}`);
      console.log(`Horizon:  ${h.horizon_reachable ? "reachable" : "unreachable"}`);
      console.log(`Version:  ${h.version}`);
    });
}
