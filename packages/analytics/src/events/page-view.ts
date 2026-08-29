import { PageViewEvent } from "../types";

export interface BuildPageViewOptions {
  /** Optional document title attached to the event. */
  title?: string;
}

/**
 * Builds a fully-formed `page_view` event for the given URL `path`.
 *
 * The current `document.referrer` is attached to the event as `referrer`
 * with any query parameters stripped, so tracking never leaks UTM or other
 * query-string identifiers. Referrer capture is skipped entirely when running
 * outside the browser or when no referrer is set.
 */
export function buildPageViewEvent(
  path: string,
  options: BuildPageViewOptions = {},
): PageViewEvent {
  const referrer = getCleanReferrer();

  return {
    id: crypto.randomUUID(),
    name: "page_view",
    timestamp: new Date(),
    properties: {
      path,
      ...(options.title !== undefined ? { title: options.title } : {}),
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