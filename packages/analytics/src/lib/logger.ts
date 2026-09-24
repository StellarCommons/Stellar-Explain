const PREFIX = '[analytics]';

/**
 * Log levels supported by the analytics Logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Lightweight logger used internally by the analytics package.
 *
 * All output is prefixed with `[analytics]` to aid filtering.
 * `debug`/`info` respect the `enabled` flag (off unless `config.debug === true`);
 * `warn`/`error` are always emitted regardless of the flag.
 */
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
