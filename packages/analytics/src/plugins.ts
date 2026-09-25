import type { AnalyticsEvent } from './types.js';

export type AnalyticsPlugin = (event: AnalyticsEvent) => AnalyticsEvent | null | undefined;

/** Run registered plugins in order, stopping when one cancels an event. */
export function applyPlugins(
  event: AnalyticsEvent,
  plugins: readonly AnalyticsPlugin[],
): AnalyticsEvent | null {
  let current: AnalyticsEvent | null | undefined = event;
  for (const plugin of plugins) {
    if (!current) break;
    current = plugin(current);
  }
  return current ?? null;
}
