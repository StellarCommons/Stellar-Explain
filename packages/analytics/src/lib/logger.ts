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
  }
}
