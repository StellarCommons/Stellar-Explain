/**
 * Analytics #47 — Plugin system for extensibility.
 *
 * A plugin observes and/or transforms events as they pass through
 * `AnalyticsClient.track()`. Both hooks are optional and run in the order
 * plugins were configured.
 */

import { AnalyticsEvent } from "./types/events";

export interface AnalyticsPlugin {
  /** Optional name, used only in warning logs when a hook throws. */
  name?: string;

  /**
   * Called with each event after it passes validation but before sampling
   * and enrichment. Return a replacement event to transform it (e.g. add
   * properties); return `undefined`/`void` to leave it unchanged.
   */
  beforeTrack?(event: AnalyticsEvent): AnalyticsEvent | void;

  /**
   * Called with the final, fully-enriched event after it has been enqueued.
   * Purely observational — its return value is ignored.
   */
  afterTrack?(event: AnalyticsEvent): void;
}

/**
 * Runs each plugin's `beforeTrack` in order, threading the (possibly
 * replaced) event through the chain. A plugin that throws is skipped with a
 * console warning rather than aborting the whole chain or the track() call.
 */
export function runBeforeTrack(
  plugins: readonly AnalyticsPlugin[],
  event: AnalyticsEvent,
): AnalyticsEvent {
  let current = event;
  for (const plugin of plugins) {
    if (!plugin.beforeTrack) continue;
    try {
      const result = plugin.beforeTrack(current);
      if (result !== undefined) current = result;
    } catch (err) {
      console.warn(`[analytics] plugin "${plugin.name ?? "unnamed"}" beforeTrack threw:`, err);
    }
  }
  return current;
}

/**
 * Runs each plugin's `afterTrack` in order. A plugin that throws is skipped
 * with a console warning; other plugins still run.
 */
export function runAfterTrack(plugins: readonly AnalyticsPlugin[], event: AnalyticsEvent): void {
  for (const plugin of plugins) {
    if (!plugin.afterTrack) continue;
    try {
      plugin.afterTrack(event);
    } catch (err) {
      console.warn(`[analytics] plugin "${plugin.name ?? "unnamed"}" afterTrack threw:`, err);
    }
  }
}
