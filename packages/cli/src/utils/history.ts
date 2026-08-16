import * as fs from 'node:fs';
import * as path from 'node:path';
import { getCacheDir, getHistoryFile } from '../config/env.js';

export interface HistoryEntry {
  type: string;
  identifier: string;
  timestamp: string;
  result: unknown;
}

export function getHistory(): HistoryEntry[] {
  const file = getHistoryFile();
  try {
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry): void {
  const dir = getCacheDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const history = getHistory();
  history.push(entry);
  fs.writeFileSync(getHistoryFile(), JSON.stringify(history, null, 2), 'utf-8');
}
