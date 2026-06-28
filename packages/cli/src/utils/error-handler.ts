export function registerGlobalErrorHandler(): void {
  process.on("unhandledRejection", (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    process.stderr.write(`\nError: ${msg}\n`);
    process.exit(1);
  });

  process.on("uncaughtException", (err: Error) => {
    process.stderr.write(`\nUnexpected error: ${err.message}\n`);
    process.exit(1);
  });
}
