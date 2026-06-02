import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ConfigFileData {
  url?: string;
  timeout?: number;
}

const CONFIG_FILE_NAME = ".stellar-explain.json";

export function findConfigFile(): string | null {
  const cwdPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  const homePath = path.join(os.homedir(), CONFIG_FILE_NAME);
  if (fs.existsSync(homePath)) {
    return homePath;
  }

  return null;
}

export function readConfigFile(): ConfigFileData {
  const configPath = findConfigFile();

  if (!configPath) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ConfigFileData;
  } catch {
    process.stderr.write(
      `Warning: Could not parse config file at ${configPath}\n`
    );
    return {};
  }
}