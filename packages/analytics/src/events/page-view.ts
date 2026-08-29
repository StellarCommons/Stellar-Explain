import { PageViewEvent } from "../types";
import { getFirstContentfulPaintMs } from "../performance";

export interface BuildPageViewOptions {
  /** Optional document title attached to the event. */
  title?: string;
}

/**
 * Builds a fully-formed `page_view` event for the given URL `path`.
 *
 * When available, First Contentful Paint timing (from the Web Performance
 * API) is attached to the event as `firstContentfulPaintMs`.
 * The current `document.referrer` is attached to the event as `referrer`
 * with any query parameters stripped, so tracking never leaks UTM or other
 * query-string identifiers. Referrer capture is skipped entirely when running
 * outside the browser or when no referrer is set.
 * The event id and timestamp are generated here so callers (e.g.
 * `AnalyticsClient.trackPageView`) only need to pass the path. Properties are
 * intentionally minimal -- no PII and no query strings.
 */
export function buildPageViewEvent(
  path: string,
  options: BuildPageViewOptions = {},
): PageViewEvent {
  const fcp = getFirstContentfulPaintMs();
  const referrer = getCleanReferrer();

  return {
    id: crypto.randomUUID(),
    name: "page_view",
    timestamp: new Date(),
    properties: {
      path,
      ...(options.title !== undefined ? { title: options.title } : {}),
      ...(fcp !== undefined ? { firstContentfulPaintMs: fcp } : {}),
      ...(referrer !== undefined ? { referrer } : {}),
    },
  };
}

/**
 * Returns `document.referrer` with the query string (and hash) removed, or
 * `undefined` when there is no referrer or it cannot be parsed.
 */
function getCleanReferrer(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const raw = document.referrer;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}