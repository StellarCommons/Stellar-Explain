export function formatJson(data: unknown, pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

export function printJson(data: unknown): void {
  process.stdout.write(formatJson(data) + "\n");
}
