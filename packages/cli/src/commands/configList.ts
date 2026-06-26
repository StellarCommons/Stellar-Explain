import type { Command } from "commander";
import { loadLocalConfig } from "../lib/localConfig.js";

export function registerConfigList(program: Command): void {
  const config =
    program.commands.find((c) => c.name() === "config") ??
    program.command("config").description("Manage local CLI configuration");
  config
    .command("list")
    .description("Print all current config values")
    .action(() => {
      const data = loadLocalConfig();
      if (Object.keys(data).length === 0) {
        console.log("No config set.");
        return;
      }
      for (const [k, v] of Object.entries(data)) {
        console.log(`${k}=${v}`);
      }
    });
}
