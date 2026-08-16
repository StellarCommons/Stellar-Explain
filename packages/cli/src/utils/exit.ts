export const ExitCode = {
  SUCCESS: 0,
  API_ERROR: 1,
  INPUT_ERROR: 2,
} as const;

export function exitProcess(code: number, message?: string): never {
  if (message) {
    console.error(`\x1b[31mError:\x1b[0m ${message}`);
  }
  process.exit(code);
}
