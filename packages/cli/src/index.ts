import { Command } from 'commander';
import { CLI_VERSION, DEFAULT_BASE_URL } from './config/env.js';
import { registerBatchCommand } from './commands/batch.js';
import { registerCacheCommands } from './commands/cache.js';
import { registerExplainCommands } from './commands/explain.js';
import { registerHealthCommand } from './commands/health.js';
import { registerVersionCommand } from './commands/version.js';

const program = new Command();

program
  .name('stellar-explain')
  .description('Query the Stellar Explain backend from your terminal')
  .version(CLI_VERSION)
  .option('--url <url>', 'Backend URL', DEFAULT_BASE_URL)
  .option('--no-update-check', 'Disable background update check');

registerExplainCommands(program);
registerBatchCommand(program);
registerCacheCommands(program);
registerHealthCommand(program);
registerVersionCommand(program);

program.parse(process.argv);
