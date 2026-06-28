import { writeFileSync } from "fs";

export function writeOutput(content: string, filePath?: string): void {
  if (filePath) {
    writeFileSync(filePath, content, "utf8");
    return;
  }
  process.stdout.write(content + "\n");
}

export function isQuiet(flags: { quiet?: boolean }): boolean {
  return flags.quiet === true;
}
