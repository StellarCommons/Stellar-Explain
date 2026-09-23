/** Simple logger that only emits when debug mode is enabled. */
export class Logger {
  constructor(private readonly debug: boolean) {}

  log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[analytics]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.debug) {
      console.warn('[analytics]', ...args);
    }
  }

  error(...args: unknown[]): void {
    // Errors always log regardless of debug flag.
    console.error('[analytics]', ...args);
  }
}
