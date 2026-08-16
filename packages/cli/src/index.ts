import { Command } from 'commander';
import { CLI_VERSION, DEFAULT_BASE_URL, isUpdateCheckDisabled } from './config/env.js';
import { ApiClient } from './client/api.js';
import { cacheGet, cacheSet } from './utils/cache.js';
import { checkForUpdate, getUpdateNotice } from './utils/update-check.js';
import { printError } from './utils/errors.js';
import { ExitCode, exitProcess } from './utils/exit.js';

const program = new Command();

program
  .name('stellar-explain')
  .description('Query the Stellar Explain backend from your terminal')
  .version(CLI_VERSION)
  .option('--url <url>', 'Backend URL', DEFAULT_BASE_URL)
  .option('--no-update-check', 'Disable background update check');

program
  .command('tx <hash>')
  .description('Explain a transaction by hash')
  .action(async (hash: string, opts: { parent: { opts: { url: string } } }) => {
    try {
      const client = new ApiClient(opts.parent.opts.url);
      const cacheKey = `tx:${hash}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) {
        console.log(JSON.stringify(cached, null, 2));
        return;
      }
      const data = await client.explainTx(hash);
      cacheSet(cacheKey, data, 5 * 60 * 1000);
      console.log(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      printError(msg);
      exitProcess(ExitCode.API_ERROR);
    }
  });

program
  .command('account <address>')
  .description('Explain an account by address')
  .action(async (address: string, opts: { parent: { opts: { url: string } } }) => {
    try {
      const client = new ApiClient(opts.parent.opts.url);
      const cacheKey = `account:${address}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) {
        console.log(JSON.stringify(cached, null, 2));
        return;
      }
      const data = await client.explainAccount(address);
      cacheSet(cacheKey, data, 5 * 60 * 1000);
      console.log(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      printError(msg);
      exitProcess(ExitCode.API_ERROR);
    }
  });

program
  .command('health')
  .description('Check backend health')
  .action(async (opts: { parent: { opts: { url: string } } }) => {
    try {
      const client = new ApiClient(opts.parent.opts.url);
      const data = await client.health();
      console.log(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      printError(msg);
      exitProcess(ExitCode.API_ERROR);
    }
  });

program
  .command('batch <file>')
  .description('Process a batch of lookups from a JSON file')
  .action(async (file: string, opts: { parent: { opts: { url: string } } }) => {
    const fs = await import('node:fs');
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      exitProcess(ExitCode.INPUT_ERROR, `Cannot read file: ${file}`);
    }
    let items: Array<{ type: string; identifier: string }>;
    try {
      items = JSON.parse(content) as Array<{ type: string; identifier: string }>;
    } catch {
      exitProcess(ExitCode.INPUT_ERROR, `Invalid JSON in ${file}`);
    }
    if (!Array.isArray(items)) {
      exitProcess(ExitCode.INPUT_ERROR, 'Input must be a JSON array');
    }
    const client = new ApiClient(opts.parent.opts.url);
    for (const item of items) {
      try {
        let data: unknown;
        if (item.type === 'tx') {
          data = await client.explainTx(item.identifier);
        } else if (item.type === 'account') {
          data = await client.explainAccount(item.identifier);
        } else {
          printError(`Unknown type: ${item.type}`);
          continue;
        }
        console.log(JSON.stringify({ type: item.type, identifier: item.identifier, result: data }, null, 2));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        printError(`Failed: ${item.type} ${item.identifier}: ${msg}`);
      }
    }
  });

if (program.opts().updateCheck && !isUpdateCheckDisabled()) {
  checkForUpdate().then(() => {
    const notice = getUpdateNotice();
    if (notice) console.error(notice);
  });
}

program.parse();
