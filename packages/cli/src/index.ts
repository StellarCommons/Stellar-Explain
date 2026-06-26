import { Command } from 'commander';
import { registerHistoryCommand } from './commands/history.js';
import { registerCompletionCommand } from './commands/completion.js';
// TODO: import { registerTxCommand } from './commands/tx.js';
// TODO: import { registerAccountCommand } from './commands/account.js';
import { addEntry } from './lib/history.js';

const program = new Command();

program
  .name('stellar-explain')
  .description('CLI for exploring and explaining Stellar transactions and accounts')
  .version('0.1.0');

// ── Existing commands (stubs shown; replace with real implementations) ────────

program
  .command('tx <hash>')
  .description('Look up and explain a Stellar transaction')
  .action((hash: string) => {
    addEntry('tx', hash);
    // TODO: delegate to tx command handler
    console.log(`Looking up transaction: ${hash}`);
  });

program
  .command('account <id>')
  .description('Look up and explain a Stellar account')
  .action((id: string) => {
    addEntry('account', id);
    // TODO: delegate to account command handler
    console.log(`Looking up account: ${id}`);
  });

registerHistoryCommand(program);    // #441 / #442 / #443
registerCompletionCommand(program); // #440

program.parse(process.argv);