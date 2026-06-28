export interface CliConfig {
  url?: string;
  token?: string;
  timeout?: number;
  color?: boolean;
}

const VALID_TYPES: Record<keyof CliConfig, string> = {
  url: "string",
  token: "string",
  timeout: "number",
  color: "boolean",
};

export function validateConfig(raw: Record<string, unknown>): CliConfig {
  const config: CliConfig = {};
  for (const [key, expectedType] of Object.entries(VALID_TYPES)) {
    const val = raw[key];
    if (val === undefined) continue;
    if (typeof val !== expectedType) {
      throw new Error(
        `Config error: "${key}" must be a ${expectedType}, got ${typeof val}`
      );
    }
    (config as Record<string, unknown>)[key] = val;
  }
  if (config.timeout !== undefined && config.timeout <= 0) {
    throw new Error('Config error: "timeout" must be a positive number');
  }
  return config;
}
