import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

function readVersion(): string {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

export const CLI_VERSION = readVersion();

export const DEFAULT_BASE_URL = 'https://stellar-explain-core.onrender.com';

export function getCacheDir(): string {
  return path.join(os.homedir(), '.stellar-explain');
}

export function getHistoryFile(): string {
  return path.join(getCacheDir(), 'history.json');
}

export function isUpdateCheckDisabled(): boolean {
  return process.env.NO_UPDATE_CHECK === '1';
}
