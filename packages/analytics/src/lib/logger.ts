export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AnalyticsLogRecord {
  level: LogLevel;
  event: string;
  meta: Record<string, unknown>;
}

const PREFIX = '[analytics]';

/** Lightweight logger used by the analytics package. */
export class Logger {
  private enabled: boolean;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled) console.debug(PREFIX, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (this.enabled) console.info(PREFIX, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.enabled) console.warn(PREFIX, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (this.enabled) console.error(PREFIX, message, ...args);
  }

  /** Emit one consistently-shaped structured record for aggregation. */
  log(level: LogLevel, event: string, meta: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    const record: AnalyticsLogRecord = { level, event, meta };
    const method = console[level] as (...args: unknown[]) => void;
    method.call(console, PREFIX, record);
  }

  /** Emit a warning even when ordinary debug logging is disabled. */
  warnAlways(event: string, meta: Record<string, unknown> = {}): void {
    const record: AnalyticsLogRecord = { level: 'warn', event, meta };
    console.warn(PREFIX, event, record);
  }
}

export const defaultLogger = new Logger(false);
