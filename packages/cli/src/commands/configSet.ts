import type { Command } from "commander";
import { loadLocalConfig, saveLocalConfig } from "../lib/localConfig.js";

export function registerConfigSet(program: Command): void {
  const config = program.command("config").description("Manage local CLI configuration");
  config
    .command("set <key> <value>")
    .description("Write a config value to .stellar-explain.json")
    .action((key: string, value: string) => {
      const current = loadLocalConfig();
      (current as Record<string, string>)[key] = value;
      saveLocalConfig(current);
      console.log(`Set ${key}=${value}`);
    });
}