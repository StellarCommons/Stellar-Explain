export interface ScrollDepthProperties {
  /** The scroll milestone reached on the result page, as a percentage. */
  percent: number;
}

export interface ScrollDepthEvent {
  id: string;
  name: "scroll_depth";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ScrollDepthProperties;
}

/** Scroll milestones tracked on result pages, as percentages. */
export const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 100] as const;

/**
 * Builds a `scroll_depth` event recording that a user reached the given
 * scroll milestone on a result page.
 *
 * @param percent - One of 25, 50, 75, or 100 (percent of page scrolled).
 */
export function buildScrollDepthEvent(percent: number): ScrollDepthEvent {
  return {
    id: crypto.randomUUID(),
    name: "scroll_depth",
    timestamp: new Date(),
    properties: { percent },
  };
}