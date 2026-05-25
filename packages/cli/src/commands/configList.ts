import type { Command } from "commander";
import { loadLocalConfig } from "../lib/localConfig.js";

export function registerConfigList(program: Command): void {
  program
    .command("config-list")
    .description("Print all current config values")
    .action(() => {
      const config = loadLocalConfig();
      if (Object.keys(config).length === 0) {
        console.log("No config set.");
        return;
      }
      for (const [k, v] of Object.entries(config)) {
        console.log(`${k}=${v}`);
      }
    });
}