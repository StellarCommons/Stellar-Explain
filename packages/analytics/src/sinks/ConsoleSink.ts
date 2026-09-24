import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';
import { Logger } from '../lib/logger.js';

/** Development/debug sink that logs each event through the shared logger. */
export class ConsoleSink implements Emitter {
  private readonly logger: Logger;

  constructor(debug = true) {
    this.logger = new Logger(debug);
  }

  send(event: AnalyticsEvent): void {
    this.logger.info('analytics event', event);
  }
}
