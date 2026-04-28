import * as fs from "fs";
import * as path from "path";

const CONFIG_FILE = ".stellar-explain.json";

export interface LocalConfig {
  url?: string;
  timeout?: number;
}

export function loadLocalConfig(): LocalConfig {
  const filePath = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as LocalConfig;
  } catch {
    process.stderr.write(`[warn] Could not read ${CONFIG_FILE} — using defaults\n`);
    return {};
  }
}

export function saveLocalConfig(config: LocalConfig): void {
  const filePath = path.resolve(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");
}