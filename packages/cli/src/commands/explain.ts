import { Command } from 'commander';
import { ApiClient } from '../client/api.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { saveToHistory, HistoryEntry } from '../utils/history.js';

export function registerExplainCommands(program: Command): void {
  program
    .command('tx <hash>')
    .description('Explain a transaction by hash')
    .option('--save-to-history', 'Save this lookup to local history', false)
    .action(async (hash: string, opts: { parent: { opts: { url: string } }; saveToHistory: boolean }) => {
      const client = new ApiClient(opts.parent.opts.url);
      const cacheKey = `tx:${hash}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) {
        console.log(JSON.stringify(cached, null, 2));
        if (opts.saveToHistory) {
          saveToHistoryEntry({ type: 'tx', identifier: hash, result: cached });
        }
        return;
      }
      const data = await client.explainTx(hash);
      cacheSet(cacheKey, data, 5 * 60 * 1000);
      console.log(JSON.stringify(data, null, 2));
      if (opts.saveToHistory) {
        saveToHistoryEntry({ type: 'tx', identifier: hash, result: data });
      }
    });

  program
    .command('account <address>')
    .description('Explain an account by address')
    .option('--save-to-history', 'Save this lookup to local history', false)
    .action(async (address: string, opts: { parent: { opts: { url: string } }; saveToHistory: boolean }) => {
      const client = new ApiClient(opts.parent.opts.url);
      const cacheKey = `account:${address}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) {
        console.log(JSON.stringify(cached, null, 2));
        if (opts.saveToHistory) {
          saveToHistoryEntry({ type: 'account', identifier: address, result: cached });
        }
        return;
      }
      const data = await client.explainAccount(address);
      cacheSet(cacheKey, data, 5 * 60 * 1000);
      console.log(JSON.stringify(data, null, 2));
      if (opts.saveToHistory) {
        saveToHistoryEntry({ type: 'account', identifier: address, result: data });
      }
    });
}

function saveToHistoryEntry(entry: Omit<HistoryEntry, 'timestamp'>): void {
  saveToHistory({ ...entry, timestamp: new Date().toISOString() });
}
