import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';

/** Emitter that logs events to the console. Useful for development. */
export class ConsoleSink implements Emitter {
  send(event: AnalyticsEvent): void {
    console.log('[analytics:event]', JSON.stringify(event));
export class ConsoleSink implements Emitter {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  send(event: AnalyticsEvent): void {
    this.logger.info('event', JSON.stringify(event));
    this.logger.info('event', event);
  }
}
