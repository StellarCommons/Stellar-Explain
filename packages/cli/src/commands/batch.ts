import type { Command } from 'commander';
import * as fs from 'node:fs';
import { ApiClient } from '../client/api.js';
import { ExitCode, exitProcess } from '../utils/exit.js';
import { clampConcurrency, mapWithConcurrency } from '../utils/concurrency.js';

interface BatchItem {
  type: string;
  identifier: string;
}

export function registerBatchCommand(program: Command): void {
  program
    .command('batch <file>')
    .description('Process a batch of lookups from a JSON file')
    .option('--dry-run', 'Validate input and print planned actions without making API calls', false)
    .option('--concurrency <n>', 'Number of requests to run in parallel (default 3, max 10)', '3')
    .action(async (file: string, opts: { dryRun: boolean; concurrency: string; parent: { opts: { url: string } } }) => {
      let content: string;
      try {
        content = fs.readFileSync(file, 'utf-8');
      } catch {
        exitProcess(ExitCode.INPUT_ERROR, `Cannot read file: ${file}`);
      }
      let items: BatchItem[];
      try {
        items = JSON.parse(content) as BatchItem[];
      } catch {
        exitProcess(ExitCode.INPUT_ERROR, `Invalid JSON in ${file}`);
      }

      if (!Array.isArray(items)) {
        exitProcess(ExitCode.INPUT_ERROR, 'Input must be a JSON array');
      }

      if (opts.dryRun) {
        console.log(`[dry-run] Would process ${items.length} item(s) from ${file}:\n`);
        for (const item of items) {
          if (item.type !== 'tx' && item.type !== 'account') {
            console.log(`  ⚠  ${item.type}/${item.identifier} — unknown type, would skip`);
          } else {
            console.log(`  →  ${item.type}/${item.identifier}`);
          }
        }
        return;
      }

      const client = new ApiClient(opts.parent.opts.url);
      const concurrency = clampConcurrency(Number(opts.concurrency));

      await mapWithConcurrency(items, concurrency, async (item) => {
        try {
          let data: unknown;
          if (item.type === 'tx') {
            data = await client.explainTx(item.identifier);
          } else if (item.type === 'account') {
            data = await client.explainAccount(item.identifier);
          } else {
            console.error(`Unknown type: ${item.type}`);
            return;
          }
          console.log(JSON.stringify({ type: item.type, identifier: item.identifier, result: data }, null, 2));
        } catch (err) {
          console.error(`Failed: ${item.type} ${item.identifier}: ${err}`);
        }
      });
    });
}
