import type { AnalyticsConfig } from './config';
import type { AnalyticsEvent } from './types';
import { Logger } from './lib/logger';
import { validateProperties } from './validate';

/**
 * Core analytics client.
 *
 * Instantiate once per application, then call `track()` wherever events
 * need to be recorded.
 *
 * @example
 * ```ts
 * const client = new AnalyticsClient(resolveConfig({ endpoint: '/ingest' }));
 * client.track('page_view', { path: '/home' });
 * ```
 */
export class AnalyticsClient {
  protected readonly config: AnalyticsConfig;
  private readonly logger: Logger;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.logger = new Logger(config.debug ?? false);
  }

  /**
   * Record an analytics event.
   *
   * @param name - Non-empty string identifying the event type.
   * @param properties - Serializable key-value metadata. Defaults to `{}`.
   * @throws {TypeError} If `name` is not a non-empty string.
   * @throws {TypeError} If `properties` contains non-serializable values.
   */
  track(name: string, properties: Record<string, unknown> = {}): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Event name must be a non-empty string');
    }

    validateProperties(properties);

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      properties,
    };

    this.logger.debug('track()', event);
  }
}
