import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';
import { Logger } from '../lib/logger.js';

/**
 * #1074 — ConsoleSink
 *
 * A drop-in Emitter for development / debugging that logs every event
 * to the console via the shared Logger.
 */
export class ConsoleSink implements Emitter {
  private readonly logger: Logger;

  constructor(debug = true) {
    this.logger = new Logger(debug);
  }

  send(event: AnalyticsEvent): void {
    this.logger.info('analytics event', event);
  }
}
