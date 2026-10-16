import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';
import { Logger } from '../lib/logger.js';

/**
 * Emitter that logs events to the console. Useful for development.
 *
 * Writing to the console is this sink's entire purpose, so unlike a stray
 * `console.log` in library code the output is:
 *
 *  - **prefixed** (`[analytics]`) so it can be filtered out of a busy console
 *    without disabling the host app's own logging, and
 *  - **gated** by an explicit switch, so a host that embeds the console sink in
 *    a non-development environment can silence it rather than removing the
 *    sink.
 *
 * Pass a {@link Logger} to control the destination yourself; pass a boolean for
 * the common case. The default is `true` — the sink is opt-*out*, matching the
 * fact that it exists to be looked at.
 */
export class ConsoleSink implements Emitter {
  private readonly logger: Logger;

  constructor(debug: boolean | Logger = true) {
    this.logger = debug instanceof Logger ? debug : new Logger(debug);
  }

  send(event: AnalyticsEvent): void {
    // The event is passed as a structured argument rather than a pre-stringified
    // string so the console renders it as an expandable object — that is the
    // main reason to use this sink over a plain log line when debugging.
    this.logger.info('analytics event', event);
  }
}