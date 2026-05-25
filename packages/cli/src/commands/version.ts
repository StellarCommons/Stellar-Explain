import type { Command } from "commander";

export function registerVersion(program: Command, cliVersion: string, apiVersion?: string): void {
  program
    .command("version")
    .description("Show CLI and API versions")
    .action(() => {
      console.log(`CLI: ${cliVersion}`);
      if (apiVersion) console.log(`API: ${apiVersion}`);
    });
}