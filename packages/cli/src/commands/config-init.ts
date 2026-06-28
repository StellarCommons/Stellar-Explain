import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const DEFAULTS = {
  url: "https://horizon.stellar.org",
  timeout: 10,
  color: true,
};

export function runConfigInit(targetDir = process.cwd()): void {
  const filePath = join(targetDir, ".stellar-explain.json");
  if (existsSync(filePath)) {
    process.stderr.write(`Config already exists at ${filePath}, skipping.\n`);
    return;
  }
  writeFileSync(filePath, JSON.stringify(DEFAULTS, null, 2) + "\n", "utf8");
  process.stdout.write(`Initialized config at ${filePath}\n`);
}
