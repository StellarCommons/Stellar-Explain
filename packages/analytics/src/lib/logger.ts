/**
 * Log levels supported by the analytics Logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[analytics]';

/**
 * Lightweight logger used internally by the analytics package.
 *
 * All output is prefixed with `[analytics]` to aid filtering.
 * `debug`/`info` are no-ops unless `enabled` is `true` (typically wired to
 * `config.debug`), so there is zero overhead in production. `warn`/`error`
 * always emit regardless of the debug flag, since they signal conditions
 * (e.g. a dropped event from queue overflow) a host app should be able to
 * see even without debug logging turned on.
 */
export class Logger {
  constructor(private readonly enabled: boolean) {}

  debug(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.debug(PREFIX, msg, ...args);
  }

  info(msg: string, ...args: unknown[]): void {
    if (this.enabled) console.info(PREFIX, msg, ...args);
  }

  warn(msg: string, ...args: unknown[]): void {
    console.warn(PREFIX, msg, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    console.error(PREFIX, msg, ...args);
  }
}
