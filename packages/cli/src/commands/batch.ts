import type { Command } from "commander";
import { createClient } from "../lib/client.js";
import { validateHash } from "../lib/validate.js";
import * as fs from "fs";

export function registerBatch(program: Command): void {
  program
    .command("batch <file>")
    .description("Explain multiple transaction hashes from a file")
    .option("--dry-run", "Validate and list hashes without making API calls", false)
    .action(async (file: string, cmdOpts: { dryRun: boolean }) => {
      const opts = program.opts<{ url: string; timeout: number; verbose: boolean; json: boolean }>();
      const hashes = fs.readFileSync(file, "utf8").split("\n").map(h => h.trim()).filter(Boolean);

      for (const hash of hashes) {
        validateHash(hash);
      }

      if (cmdOpts.dryRun) {
        process.stderr.write(`Dry run — ${hashes.length} hash(es) found, no API calls made:\n`);
        for (const hash of hashes) {
          process.stderr.write(`  ${hash}\n`);
        }
        return;
      }

      const client = createClient({ baseUrl: opts.url, timeout: opts.timeout, verbose: opts.verbose });
      const results: unknown[] = [];
      for (const hash of hashes) {
        const tx = await client.getTransaction(hash);
        results.push(tx);
      }
      console.log(JSON.stringify(results, null, 2));
    });
}
