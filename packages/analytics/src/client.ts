/**
 * @fileoverview Minimal `AnalyticsClient` class — the public API surface
 * for the analytics package.  Subsequent issues will add tracking behaviour,
 * a flush queue, and an HTTP sink on top of this foundation.
 */

import type { AnalyticsConfig } from './config.js';

/**
 * The main analytics client.
 *
 * Instantiate once (e.g. as a module-level singleton) and share it across
 * your application.  Pass a fully-resolved {@link AnalyticsConfig} — produced
 * by {@link resolveConfig} — to the constructor.
 *
 * @example
 * ```ts
 * import { resolveConfig } from './config.js';
 * import { AnalyticsClient } from './client.js';
 *
 * const client = new AnalyticsClient(
 *   resolveConfig({ endpoint: 'https://ingest.example.com/v1/events' })
 * );
 * ```
 */
export class AnalyticsClient {
  /**
   * The resolved configuration this client was constructed with.
   * Accessible to subclasses so they can read endpoint, API key, etc.
   */
  protected readonly config: AnalyticsConfig;

  /**
   * Creates a new `AnalyticsClient` and stores the supplied configuration.
   *
   * @param config - A fully-resolved {@link AnalyticsConfig}.  Use
   *   {@link resolveConfig} to obtain one with defaults applied.
   */
  constructor(config: AnalyticsConfig) {
    this.config = config;
  }
}
