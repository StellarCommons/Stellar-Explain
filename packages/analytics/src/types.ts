/**
 * @fileoverview Core analytics type definitions shared across the analytics package.
 * Every event builder, queue, and sink depends on the types defined here.
 */

/**
 * The base shape for every analytics event tracked through the system.
 *
 * @example
 * ```ts
 * const event: AnalyticsEvent = {
 *   name: 'page_view',
 *   timestamp: Date.now(),
 *   properties: { path: '/home', referrer: 'https://example.com' },
 * };
 * ```
 */
export interface AnalyticsEvent {
  /**
   * The name of the event (e.g. `'page_view'`, `'button_click'`).
   * Should be a stable, snake_cased string understood by the downstream pipeline.
   */
  name: string;

  /**
   * Unix epoch timestamp in milliseconds indicating when the event occurred.
   * Typically produced by `Date.now()` at the call-site.
   */
  timestamp: number;

  /**
   * Arbitrary key-value metadata attached to the event.
   * Values may be any JSON-serialisable type; use `unknown` to force
   * explicit narrowing at consumption boundaries.
   */
  properties: Record<string, unknown>;
}
