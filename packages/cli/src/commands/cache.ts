// Closes #633: 'cache clear' command.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { getCacheDir } from '../config/env.js';

export function registerCacheCommands(program: Command): void {
  const cache = program.command('cache').description('Manage the local response cache');

  cache
    .command('clear')
    .description('Delete all cached lookups')
    .action(() => {
      const dir = getCacheDir();
      if (!fs.existsSync(dir)) {
        console.log('Cache is already empty (0 entries, 0 bytes freed).');
        return;
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'history.json');
      let totalBytes = 0;
      for (const file of files) {
        const filePath = path.join(dir, file);
        totalBytes += fs.statSync(filePath).size;
        fs.unlinkSync(filePath);
      }
      console.log(`Cleared ${files.length} entries, freed ${totalBytes} bytes.`);
    });
}
