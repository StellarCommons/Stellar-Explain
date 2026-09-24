const PREFIX = '[analytics]';

/**
 * Log levels supported by the analytics Logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Lightweight logger used internally by the analytics package.
 *
 * All output is prefixed with `[analytics]` to aid filtering.
 * When `enabled` is `false` (the default unless `config.debug === true`)
 * every method is a no-op, so there is zero overhead in production.
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
    if (this.enabled) console.warn(PREFIX, ...args);
  }

  error(...args: unknown[]): void {
    if (this.enabled) console.error(PREFIX, ...args);
  }
}
