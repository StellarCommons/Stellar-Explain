// Fix: replace duplicate error-log.ts with real error logging (#1331)
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const LOG_FILE = path.join(os.homedir(), '.stellar-explain-errors.log');
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const prefix = context ? `[${timestamp}] [${context}]` : `[${timestamp}]`;
  const entry = `${prefix} ${message}\n`;
  try { fs.appendFileSync(LOG_FILE, entry, 'utf8'); } catch { }
}
