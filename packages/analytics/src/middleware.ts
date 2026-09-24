import type { AnalyticsEvent } from './types.js';
import type { AnalyticsPlugin } from './plugins.js';

export type BeforeSend = (event: AnalyticsEvent) => AnalyticsEvent | null | undefined;

export interface MiddlewareOptions {
  beforeSend?: BeforeSend;
  plugins?: readonly AnalyticsPlugin[];
}

/** Compose the ordered before-send and plugin middleware chain. */
export function runMiddleware(
  event: AnalyticsEvent,
  options: MiddlewareOptions = {},
): AnalyticsEvent | null {
  let current: AnalyticsEvent | null | undefined = options.beforeSend
    ? options.beforeSend(event)
    : event;
  for (const plugin of options.plugins ?? []) {
    if (!current) break;
    current = plugin(current);
  }
  return current ?? null;
}
