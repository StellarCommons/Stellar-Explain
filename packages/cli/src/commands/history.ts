import { Command } from 'commander';
import {
  readHistory,
  clearHistory,
  historyFilePath,
} from '../lib/history.js';

const DEFAULT_LIMIT = 20;

export function registerHistoryCommand(program: Command): void {
  const history = program
    .command('history')
    .description('Show recent tx and account lookups')
    .option(
      '-l, --limit <n>',
      'Maximum number of entries to display',
      String(DEFAULT_LIMIT),
    )
    .option('--kind <type>', 'Filter by lookup type: tx | account')
    .action((opts: { limit: string; kind?: string }) => {
      const limit = Math.max(1, parseInt(opts.limit, 10) || DEFAULT_LIMIT);
      let entries = readHistory();

      if (opts.kind) {
        const kind = opts.kind.toLowerCase();
        if (kind !== 'tx' && kind !== 'account') {
          console.error(`Unknown kind "${opts.kind}". Use "tx" or "account".`);
          process.exit(1);
        }
        entries = entries.filter((e) => e.kind === kind);
      }

      // Show most-recent first, capped by --limit
      const shown = entries.slice(-limit).reverse();

      if (shown.length === 0) {
        console.log('No history found.');
        return;
      }

      const kindWidth = 7; // 'account' is longest
      shown.forEach((e, i) => {
        const index = String(i + 1).padStart(3, ' ');
        const kind = e.kind.padEnd(kindWidth);
        const ts = new Date(e.timestamp).toLocaleString();
        console.log(`${index}  ${kind}  ${e.query}  (${ts})`);
      });

      console.log(`\n${shown.length} entr${shown.length === 1 ? 'y' : 'ies'} shown  •  stored in ${historyFilePath()}`);
    });

  // `history clear` subcommand (#443)
  history
    .command('clear')
    .description('Delete the local history file')
    .action(() => {
      clearHistory();
      console.log(`History cleared.  (${historyFilePath()})`);
    });
}