import * as fs from "fs";
import * as path from "path";

const HISTORY_FILE = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".",
  ".stellar-explain-history.json"
);

export function clearHistory(): void {
  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
  console.log("History cleared.");
}