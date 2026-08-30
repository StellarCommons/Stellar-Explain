export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const consoleMethod: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

function defaultIsProduction(): boolean {
  return (
    typeof process !== "undefined" &&
    !!process.env &&
    process.env.NODE_ENV === "production"
  );
}

function defaultWriteLine(line: string): void {
  if (typeof process !== "undefined" && typeof process.stderr?.write === "function") {
    process.stderr.write(line + "\n");
  } else {
    // No stderr in this environment (e.g. a browser bundle) — fall back to
    // the console so a production JSON line still surfaces somewhere.
    console.log(line);
  }
}

export interface ConsoleLoggerOptions {
  /** Overrides production detection — primarily for tests. */
  isProduction?: () => boolean;
  /** Overrides the production JSON-line writer — primarily for tests. */
  writeLine?: (line: string) => void;
}

/**
 * Structured logger for the analytics pipeline (issue #98). In development,
 * each record is pretty-printed to the console. In production, it's written
 * as a single `{ level, message, timestamp, context? }` JSON line to
 * stderr (or `console.log` where stderr doesn't exist, e.g. a browser
 * bundle) so log records stay machine-parseable either way.
 */
export class ConsoleLogger implements Logger {
  private readonly isProduction: () => boolean;
  private readonly writeLine: (line: string) => void;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.isProduction = options.isProduction ?? defaultIsProduction;
    this.writeLine = options.writeLine ?? defaultWriteLine;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context !== undefined ? { context } : {}),
    };

    if (this.isProduction()) {
      this.writeLine(JSON.stringify(record));
      return;
    }

    if (context !== undefined) {
      consoleMethod[level](`[analytics] [${level}] ${record.timestamp} ${message}`, context);
    } else {
      consoleMethod[level](`[analytics] [${level}] ${record.timestamp} ${message}`);
    }
  }
}

/** Shared default logger instance — injectable per-instance where needed (e.g. `EventEmitter`). */
export const defaultLogger: Logger = new ConsoleLogger();
