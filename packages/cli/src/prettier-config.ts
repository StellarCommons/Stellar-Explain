/**
 * Validates that the Prettier config exists and matches expected rules.
 * Issue #332 — Add Prettier config to the CLI package.
 */

import fs from "fs";
import path from "path";

interface PrettierConfig {
  semi: boolean;
  singleQuote: boolean;
  printWidth: number;
  trailingComma: string;
  tabWidth: number;
}

const EXPECTED: PrettierConfig = {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  trailingComma: "all",
  tabWidth: 2,
};

export function loadPrettierConfig(root: string): PrettierConfig | null {
  const configPath = path.join(root, ".prettierrc");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as PrettierConfig;
  } catch {
    return null;
  }
}

export function validatePrettierConfig(config: PrettierConfig): string[] {
  const errors: string[] = [];
  for (const [key, expected] of Object.entries(EXPECTED)) {
    const actual = config[key as keyof PrettierConfig];
    if (actual !== expected) {
      errors.push(`"${key}": expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  return errors;
}

export function checkPrettierSetup(root: string): void {
  const config = loadPrettierConfig(root);
  if (!config) {
    console.error("Missing .prettierrc in", root);
    process.exit(1);
  }
  const errors = validatePrettierConfig(config);
  if (errors.length > 0) {
    console.error("Prettier config mismatch:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("Prettier config OK");
}
