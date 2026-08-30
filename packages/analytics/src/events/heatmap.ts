export interface HeatmapClickProperties {
  /** Horizontal click position as a percentage (0–100) of the viewport width. */
  x: number;
  /** Vertical click position as a percentage (0–100) of the viewport height. */
  y: number;
  /** Page path where the click occurred. */
  path: string;
  [key: string]: unknown;
}

export interface HeatmapClickEvent {
  id: string;
  name: "heatmap_click";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: HeatmapClickProperties;
}

/**
 * Builds a `heatmap_click` event recording a normalised click position for
 * heatmap generation.
 *
 * @param x    - Horizontal click position as a percentage (0–100).
 * @param y    - Vertical click position as a percentage (0–100).
 * @param path - Page path where the click occurred.
 */
export function buildHeatmapClickEvent(
  x: number,
  y: number,
  path: string,
): HeatmapClickEvent {
  return {
    id: crypto.randomUUID(),
    name: "heatmap_click",
    timestamp: new Date(),
    properties: { x, y, path },
  };
}

/**
 * Converts a mouse `clientX`/`clientY` pair to normalised viewport
 * percentages (0–100).  Returns `undefined` when `window` is unavailable.
 */
export function normaliseClick(
  clientX: number,
  clientY: number,
): { x: number; y: number } | undefined {
  if (typeof window === "undefined") return undefined;

  const x = Math.round((clientX / window.innerWidth) * 1000) / 10;
  const y = Math.round((clientY / window.innerHeight) * 1000) / 10;

  return { x, y };
}
