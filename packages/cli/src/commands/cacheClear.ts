import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";

const CACHE_DIR = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".",
  ".stellar-explain-cache"
);

export function registerCacheClear(program: Command): void {
  program
    .command("cache-clear")
    .description("Delete all locally cached responses")
    .action(() => {
      if (fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      console.log("Cache cleared.");
    });
}