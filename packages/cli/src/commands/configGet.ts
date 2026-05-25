import type { Command } from "commander";
import { loadLocalConfig } from "../lib/localConfig.js";

export function registerConfigGet(program: Command): void {
  program
    .command("config-get <key>")
    .description("Read a config value from .stellar-explain.json")
    .action((key: string) => {
      const config = loadLocalConfig() as Record<string, unknown>;
      const val = config[key];
      if (val === undefined) {
        process.stderr.write(`Key not found: ${key}\n`);
        process.exit(1);
      }
      console.log(String(val));
    });
}