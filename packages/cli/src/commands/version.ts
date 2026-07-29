// Closes #634: 'version' command showing CLI and API versions.
import { Command } from 'commander';
import { CLI_VERSION } from '../config/env.js';
import { ApiClient } from '../client/api.js';

export function registerVersionCommand(program: Command): void {
  program
    .command('version')
    .description('Show CLI and API versions')
    .action(async (opts: { parent: { opts: { url: string } } }) => {
      console.log(`CLI: ${CLI_VERSION}`);
      try {
        const client = new ApiClient(opts.parent.opts.url);
        const health = await client.health();
        console.log(`API: ${health.version}`);
      } catch {
        console.log('API: unavailable');
      }
    });
}
