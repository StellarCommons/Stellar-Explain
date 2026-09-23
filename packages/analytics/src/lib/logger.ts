const PREFIX = '[analytics]';

/** Lightweight logger that respects a debug flag. */
export class Logger {
  constructor(private readonly enabled: boolean) {}

  debug(...args: unknown[]): void {
    if (this.enabled) console.debug(PREFIX, ...args);
  }

  info(...args: unknown[]): void {
    if (this.enabled) console.info(PREFIX, ...args);
  }

  warn(...args: unknown[]): void {
    // Warnings are always emitted regardless of debug flag.
    console.warn(PREFIX, ...args);
  }

  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  }
}
