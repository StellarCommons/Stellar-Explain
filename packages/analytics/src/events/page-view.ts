import { PageViewEvent } from "../types";

export interface BuildPageViewOptions {
  /** Optional document title attached to the event. */
  title?: string;
}

/**
 * Builds a fully-formed `page_view` event for the given URL `path`.
 *
 * The event id and timestamp are generated here so callers (e.g.
 * `AnalyticsClient.trackPageView`) only need to pass the path. Properties are
 * intentionally minimal -- no PII and no query strings.
 */
export function buildPageViewEvent(
  path: string,
  options: BuildPageViewOptions = {},
): PageViewEvent {
  return {
    id: crypto.randomUUID(),
    name: "page_view",
    timestamp: new Date(),
    properties: {
      path,
      ...(options.title !== undefined ? { title: options.title } : {}),
    },
  };
}