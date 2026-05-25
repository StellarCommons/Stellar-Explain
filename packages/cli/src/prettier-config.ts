/**
 * Validates that the Prettier config exists and matches expected rules.
 * Issue #332 — Add Prettier config to the CLI package.
 */

import * as fs from 'fs';
import * as path from 'path';

interface PrettierConfig {
  semi: boolean;
  singleQuote: boolean;
  printWidth: number;
  trailingComma: string;
  tabWidth: number;
  arrowParens?: string;
}

const DEFAULTS: PrettierConfig = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
};

const EXPECTED: PrettierConfig = {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  trailingComma: 'all',
  tabWidth: 2,
};

export function loadPrettierConfig(packageDir: string): PrettierConfig {
  const configPath = path.join(packageDir, '.prettierrc');
  if (!fs.existsSync(configPath)) {
    return DEFAULTS;
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return { ...DEFAULTS, ...JSON.parse(raw) } as PrettierConfig;
}

export function validatePrettierConfig(config: PrettierConfig): string[] {
  const errors: string[] = [];
  for (const [key, expected] of Object.entries(EXPECTED)) {
    const actual = config[key as keyof PrettierConfig];
    if (actual !== expected) {
      errors.push(`"${key}": expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  if (config.printWidth < 40 || config.printWidth > 200) {
    errors.push(`printWidth ${config.printWidth} is out of range [40, 200]`);
  }
  if (config.tabWidth < 1 || config.tabWidth > 8) {
    errors.push(`tabWidth ${config.tabWidth} is out of range [1, 8]`);
  }
  if (!['es5', 'all', 'none'].includes(config.trailingComma)) {
    errors.push(`trailingComma "${config.trailingComma}" is not valid`);
  }
  return errors;
}

export function checkPrettierSetup(root: string): void {
  const config = loadPrettierConfig(root);
  const errors = validatePrettierConfig(config);
  if (errors.length > 0) {
    console.error('Prettier config mismatch:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('Prettier config OK');
}

export function describePrettierConfig(config: PrettierConfig): string {
  const parts = [
    `printWidth=${config.printWidth}`,
    `tabWidth=${config.tabWidth}`,
    config.singleQuote ? 'singleQuote' : 'doubleQuote',
    config.semi ? 'semi' : 'noSemi',
    `trailingComma=${config.trailingComma}`,
  ];
  return parts.join(', ');
}
