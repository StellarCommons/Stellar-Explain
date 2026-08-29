/**
 * Device type detection.
 *
 * Classifies the current viewport as mobile, tablet, or desktop using
 * `window.innerWidth`. The lookup is defensive: it never throws and returns
 * `undefined` outside a browser (Node/SSR) where `window` does not exist.
 */

export type DeviceType = "mobile" | "tablet" | "desktop";

/** CSS-pixel width below which the viewport is considered a mobile device. */
export const MOBILE_BREAKPOINT_PX = 768;

/** CSS-pixel width below which the viewport is considered a tablet device. */
export const TABLET_BREAKPOINT_PX = 1024;

/**
 * Returns the current device type, or `undefined` when the viewport width
 * cannot be read.
 */
export function getDeviceType(): DeviceType | undefined {
  if (typeof window === "undefined" || typeof window.innerWidth !== "number") {
    return undefined;
  }

  const width = window.innerWidth;
  if (width < MOBILE_BREAKPOINT_PX) return "mobile";
  if (width < TABLET_BREAKPOINT_PX) return "tablet";
  return "desktop";
}