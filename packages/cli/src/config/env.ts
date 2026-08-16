import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export const CLI_VERSION = '0.1.0';

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
