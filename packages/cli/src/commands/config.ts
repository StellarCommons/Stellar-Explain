import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const DEFAULT_CONFIG = {
  url: "https://horizon.stellar.org",
  timeout: 10,
  color: true,
};

const CONFIG_FILE = ".stellar-explain.json";

export function configInit(): void {
  const target = join(process.cwd(), CONFIG_FILE);
  if (existsSync(target)) {
    console.warn(`Config file already exists: ${target}`);
    return;
  }
  writeFileSync(target, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  console.log(`Created ${target}`);
}

export function configShow(resolved: Record<string, unknown>): void {
  const rows = Object.entries(resolved).map(([k, v]) => `  ${k.padEnd(12)} ${String(v)}`);
  console.log("Current configuration:\n" + rows.join("\n"));
}
