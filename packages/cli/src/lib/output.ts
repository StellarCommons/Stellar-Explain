export function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

export function printSuccess(message: string): void {
  process.stdout.write(`${message}\n`);
}
