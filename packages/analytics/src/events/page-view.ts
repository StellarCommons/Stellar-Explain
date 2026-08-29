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
 */
export function buildPageViewEvent(
  path: string,
  options: BuildPageViewOptions = {},
): PageViewEvent {
  const fcp = getFirstContentfulPaintMs();

  return {
    id: crypto.randomUUID(),
    name: "page_view",
    timestamp: new Date(),
    properties: {
      path,
      ...(options.title !== undefined ? { title: options.title } : {}),
      ...(fcp !== undefined ? { firstContentfulPaintMs: fcp } : {}),
    },
  };
}