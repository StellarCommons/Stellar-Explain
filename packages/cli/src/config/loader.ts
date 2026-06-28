import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface CliConfig {
  url?: string;
  token?: string;
  timeout?: number;
  color?: boolean;
}

const ALLOWED_KEYS = new Set(["url", "token", "timeout", "color"]);

export function loadConfig(filePath?: string): CliConfig {
  const candidates = filePath
    ? [filePath]
    : [join(process.cwd(), ".stellar-explain.json"), join(require("os").homedir(), ".stellar-explain.json")];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const raw = JSON.parse(readFileSync(candidate, "utf8"));
    const cfg: CliConfig = {};
    for (const [k, v] of Object.entries(raw)) {
      if (ALLOWED_KEYS.has(k)) (cfg as Record<string, unknown>)[k] = v;
    }
    return cfg;
  }
  return {};
}
