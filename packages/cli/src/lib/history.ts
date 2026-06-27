import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LookupKind = 'tx' | 'account';

export interface HistoryEntry {
  kind: LookupKind;
  query: string;
  timestamp: string; // ISO-8601
}

const HISTORY_DIR = path.join(os.homedir(), '.stellar-explain');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');
const MAX_STORED = 500; // cap stored entries to avoid unbounded growth

function ensureDir(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

/** Read all stored entries (oldest-first). */
export function readHistory(): HistoryEntry[] {
  ensureDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

/** Append a new lookup to the history file. */
export function addEntry(kind: LookupKind, query: string): void {
  ensureDir();
  const entries = readHistory();
  entries.push({ kind, query, timestamp: new Date().toISOString() });
  // Keep only the most recent MAX_STORED entries
  const trimmed = entries.slice(-MAX_STORED);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

/** Delete the history file entirely. */
export function clearHistory(): void {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.rmSync(HISTORY_FILE);
  }
}

/** Return the resolved path to the history file (useful for user-facing messages). */
export function historyFilePath(): string {
  return HISTORY_FILE;
}