const ESC = "\x1B";
const codes = {
  reset:  `${ESC}[0m`,
  green:  `${ESC}[32m`,
  red:    `${ESC}[31m`,
  dim:    `${ESC}[2m`,
  white:  `${ESC}[37m`,
};

export const chalk = {
  green:  (s: string) => `${codes.green}${s}${codes.reset}`,
  red:    (s: string) => `${codes.red}${s}${codes.reset}`,
  dim:    (s: string) => `${codes.dim}${s}${codes.reset}`,
  white:  (s: string) => `${codes.white}${s}${codes.reset}`,
};

export function colorizeOutput(
  label: string,
  value: string,
  ok: boolean,
  colorEnabled: boolean
): string {
  if (!colorEnabled) return `${label}: ${value}`;
  const v = ok ? chalk.green(value) : chalk.red(value);
  return `${chalk.dim(label)}: ${chalk.white(v)}`;
}
