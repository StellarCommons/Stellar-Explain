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
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as LocalConfig;
}

export function saveLocalConfig(config: LocalConfig): void {
  const filePath = path.resolve(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");
}