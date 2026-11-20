/**
 * Log levels supported by the analytics Logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[analytics]';

/**
 * Lightweight logger used internally by the analytics package.
 *
 * All output is prefixed with `[analytics]` to aid filtering.
 *
 * ## Gating
 *
 * **Every level — including `warn` and `error` — is gated on `enabled`.**
 * There is no "errors always log" tier.
 *
 * The file this replaces contained two contradictory variants: one that gated
 * all four levels, and one that let `warn`/`error` through regardless of the
 * flag on the reasoning that warnings and errors matter even in production.
 * `tests/logger.test.ts` settles it — it asserts that a `new Logger(false)`
 * calls **no** `console.error`, so the always-log variant cannot be the
 * contract.
 *
 * The reasoning that loses is worth recording, because it will be proposed
 * again: "errors should always log" is true of an *application* logger. This
 * one belongs to an analytics client that a host embeds, and `enabled` is
 * driven by that host's `config.debug`. A host that has turned analytics
 * debugging off has not asked this library to write to its console, and a
 * library that writes to `console.error` regardless is indistinguishable from
 * one that ignores its configuration. If a host wants unconditional error
 * logging, it should attach its own logger to the sinks it uses.
 *
 * ## `log()`
 *
 * `log()` is an alias of `info()`, not a fifth level. `queue.ts`,
 * `utils/limitPayload.ts` and `client.ts` all call `logger.log(...)`, while
 * `sinks/ConsoleSink.ts` calls `logger.info(...)`; aliasing keeps both call
 * sites correct without maintaining two methods with the same behaviour.
 */
export class Logger {
  constructor(private readonly enabled: boolean) {}

  debug(...args: unknown[]): void {
    if (this.enabled) console.debug(PREFIX, ...args);
  }

  info(...args: unknown[]): void {
    if (this.enabled) console.info(PREFIX, ...args);
  }

  /** Alias of {@link Logger.info}. */
  log(...args: unknown[]): void {
    this.info(...args);
  }

  warn(...args: unknown[]): void {
    if (this.enabled) console.warn(PREFIX, ...args);
  }

  error(...args: unknown[]): void {
    if (this.enabled) console.error(PREFIX, ...args);
  }
}