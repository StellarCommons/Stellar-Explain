export class CliError extends Error {
  constructor(message: string, public readonly exitCode: number) {
    super(message);
    this.name = 'CliError';
  }
}

export function formatError(message: string): string {
  return `\x1b[31mError:\x1b[0m ${message}`;
}

export function printError(message: string): void {
  console.error(formatError(message));
}
