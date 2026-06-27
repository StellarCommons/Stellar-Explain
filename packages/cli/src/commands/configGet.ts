import type { Command } from "commander";
import { loadLocalConfig } from "../lib/localConfig.js";

export function registerConfigGet(program: Command): void {
  const config =
    program.commands.find((c) => c.name() === "config") ??
    program.command("config").description("Manage local CLI configuration");
  config
    .command("get <key>")
    .description("Read a config value from .stellar-explain.json")
    .action((key: string) => {
      const data = loadLocalConfig() as Record<string, unknown>;
      const val = data[key];
      if (val === undefined) {
        process.stderr.write(`Key not found: ${key}\n`);
        process.exit(1);
      }
      console.log(String(val));
    });
}
