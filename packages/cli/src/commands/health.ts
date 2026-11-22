import { Command } from 'commander';
import { ApiClient } from '../client/api.js';
import { printError } from '../utils/errors.js';
import { ExitCode, exitProcess } from '../utils/exit.js';

export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Check backend health')
    .action(async (_opts: unknown, command: Command) => {
      try {
        const url = String(command.optsWithGlobals().url);
        const client = new ApiClient(url);
        const data = await client.health();
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        printError((err as Error).message);
        exitProcess(ExitCode.API_ERROR);
      }
    });
}
