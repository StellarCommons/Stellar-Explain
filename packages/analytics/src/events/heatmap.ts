import { AnalyticsEvent } from '../types';

export interface HeatmapPointOptions {
  /** Raw click x-coordinate in pixels. */
  x: number;
  /** Raw click y-coordinate in pixels. */
  y: number;
  /** Viewport width in pixels. Defaults to `window.innerWidth` when available. */
  viewportWidth?: number;
  /** Viewport height in pixels. Defaults to `window.innerHeight` when available. */
  viewportHeight?: number;
}

/**
 * Builds a heatmap analytics event, normalizing raw pixel coordinates to
 * a 0–1 range relative to the viewport so points remain comparable across
 * different screen sizes.
 *
 * Falls back to `window.innerWidth`/`innerHeight` for the viewport
 * dimensions when not explicitly provided (e.g. in a browser context).
 * Returns `undefined` normalized coordinates rather than dividing by
 * zero/undefined when no viewport size is available at all.
 */
export function createHeatmapEvent(options: HeatmapPointOptions): AnalyticsEvent {
  const { x, y } = options;

  const viewportWidth =
    options.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : undefined);
  const viewportHeight =
    options.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : undefined);

  const normalizedX =
    viewportWidth && viewportWidth > 0 ? clamp01(x / viewportWidth) : undefined;
  const normalizedY =
    viewportHeight && viewportHeight > 0 ? clamp01(y / viewportHeight) : undefined;

  return {
    name: 'heatmap_click',
    timestamp: Date.now(),
    properties: {
      x,
      y,
      ...(normalizedX !== undefined ? { normalizedX } : {}),
      ...(normalizedY !== undefined ? { normalizedY } : {}),
      ...(viewportWidth !== undefined ? { viewportWidth } : {}),
      ...(viewportHeight !== undefined ? { viewportHeight } : {}),
    },
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
