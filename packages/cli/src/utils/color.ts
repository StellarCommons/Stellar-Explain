export function isColorEnabled(flags: { noColor?: boolean } = {}): boolean {
  if (flags.noColor) return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout.isTTY === true;
}

export function stripColor(text: string): string {
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

export function maybeColor(
  text: string,
  colorFn: (s: string) => string,
  enabled: boolean
): string {
  return enabled ? colorFn(text) : text;
}
