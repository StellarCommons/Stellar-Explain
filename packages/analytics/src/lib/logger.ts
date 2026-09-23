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

  debug(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.debug('[analytics]', msg, ...args);
  }

  info(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.info('[analytics]', msg, ...args);
  }

  warn(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.warn('[analytics]', msg, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.error('[analytics]', msg, ...args);
  }
}
