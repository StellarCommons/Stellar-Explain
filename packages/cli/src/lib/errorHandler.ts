export function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}
