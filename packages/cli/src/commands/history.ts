import type { Command } from "commander";
import { loadHistory } from "../lib/historyStore.js";

export function registerHistory(program: Command): void {
  program
    .command("history")
    .description("Show recent CLI lookups")
    .option("--limit <n>", "Max entries to show", (v) => parseInt(v, 10), 10)
    .action((cmdOpts: { limit: number }) => {
      const entries = loadHistory().slice(-cmdOpts.limit);
      if (entries.length === 0) { console.log("No history yet."); return; }
      entries.forEach((e) => console.log(e));
    });
}