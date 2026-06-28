let quietMode = false;

export function setQuiet(value: boolean): void {
  quietMode = value;
}

export function isQuiet(): boolean {
  return quietMode;
}

export function log(message: string): void {
  if (!quietMode) process.stdout.write(message + "\n");
}

export function logError(message: string): void {
  process.stderr.write(message + "\n");
}
