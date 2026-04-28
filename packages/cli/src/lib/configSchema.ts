/**
 * Schema definition and validator for .stellar-explain.json local config.
 *
 * Supported fields:
 *   url     — Base URL of the Stellar Explain API (string, optional)
 *   timeout — Request timeout in milliseconds (number, optional)
 */

export interface LocalConfigSchema {
  url?: string;
  timeout?: number;
}

export type ValidationResult =
  | { valid: true; config: LocalConfigSchema }
  | { valid: false; errors: string[] };

const URL_RE = /^https?:\/\/.+/;

export function validateLocalConfig(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["Config must be a JSON object"] };
  }

  const obj = raw as Record<string, unknown>;

  if ("url" in obj) {
    if (typeof obj.url !== "string" || !URL_RE.test(obj.url)) {
      errors.push("`url` must be a valid http/https URL string");
    }
  }

  if ("timeout" in obj) {
    if (typeof obj.timeout !== "number" || obj.timeout <= 0 || !Number.isInteger(obj.timeout)) {
      errors.push("`timeout` must be a positive integer (milliseconds)");
    }
  }

  const known = new Set(["url", "timeout"]);
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) errors.push(`Unknown field: \`${key}\``);
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, config: obj as LocalConfigSchema };
}

export const CONFIG_EXAMPLE: LocalConfigSchema = {
  url: "http://localhost:3000",
  timeout: 5000,
};
