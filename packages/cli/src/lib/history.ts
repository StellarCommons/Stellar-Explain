import * as fs from "fs";
import * as path from "path";
import { DEFAULT_HISTORY_LIMIT, applyLimit } from "./historyLimit.js";

const HISTORY_FILE = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".",
  ".stellar-explain-history.json",
);

export interface HistoryEntry {
  input: string;
  timestamp: string;
}

export function addEntry(entry: HistoryEntry, limit = DEFAULT_HISTORY_LIMIT): void {
  const entries = loadEntries();
  entries.push(entry);
  const trimmed = applyLimit(entries, limit);
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed), "utf8");
}

export function loadEntries(): HistoryEntry[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as HistoryEntry[];
}

export function clearHistory(): void {
  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
}
