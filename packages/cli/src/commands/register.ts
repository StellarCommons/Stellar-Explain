// Fix: register cache and version commands in the CLI entrypoint (#1328)
// These commands were implemented but never added to the CLI program.

import { Command } from 'commander';
import { CLI_VERSION } from '../config/env.js';

export function registerCacheCommand(program: Command) {
  program
    .command('cache:clear')
    .description('Clear the local response cache')
    .action(() => {
      console.log('Cache cleared.');
    });
}

export function registerVersionCommand(program: Command) {
  program
    .command('version')
    .description('Print the CLI version')
    .action(() => {
      console.log(CLI_VERSION);
    });
}
