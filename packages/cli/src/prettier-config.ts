import * as fs from 'fs';
import * as path from 'path';

interface PrettierConfig {
  semi: boolean;
  singleQuote: boolean;
  trailingComma: string;
  printWidth: number;
  tabWidth: number;
  arrowParens: string;
}

const DEFAULTS: PrettierConfig = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
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
