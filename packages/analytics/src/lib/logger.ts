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
const PREFIX = '[analytics]';

export class Logger {
  private readonly enabled: boolean;

  constructor(debug: boolean) {
    this.enabled = debug;
  }

  debug(...args: unknown[]): void {
    if (this.enabled) console.debug(PREFIX, ...args);
  }

  info(...args: unknown[]): void {
    if (this.enabled) console.info(PREFIX, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args);
  }

  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
export class Logger {
  private readonly enabled: boolean;
  private readonly prefix = '[analytics]';

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  debug(...args: unknown[]): void {
    if (this.enabled) console.debug(this.prefix, ...args);
  }

  info(...args: unknown[]): void {
    if (this.enabled) console.info(this.prefix, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.prefix, ...args);
  }
}
