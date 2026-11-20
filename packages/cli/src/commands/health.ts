import { Command } from 'commander';
import { ApiClient } from '../client/api.js';
import { printError } from '../utils/errors.js';
import { ExitCode, exitProcess } from '../utils/exit.js';

export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Check backend health')
    .action(async (opts: { parent: { opts: { url: string } } }) => {
      try {
        const client = new ApiClient(opts.parent.opts.url);
        const data = await client.health();
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        printError((err as Error).message);
        exitProcess(ExitCode.API_ERROR);
      }
    });
}
