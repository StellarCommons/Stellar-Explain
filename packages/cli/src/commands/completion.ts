import type { Command } from "commander";
import { generateCompletion, type Shell } from "../lib/completion.js";

export function registerCompletion(program: Command): void {
  program
    .command("completion <shell>")
    .description("Output shell completion script (bash or zsh)")
    .action((shell: string) => {
      if (shell !== "bash" && shell !== "zsh") {
        process.stderr.write(`Error: unsupported shell "${shell}". Use bash or zsh.\n`);
        process.exit(1);
      }
      console.log(generateCompletion(shell as Shell));
    });
}
