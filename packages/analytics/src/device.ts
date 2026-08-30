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

export type ColorScheme = "light" | "dark";

/**
 * Returns the user's preferred color scheme via the `prefers-color-scheme`
 * media query, or `undefined` when it cannot be determined (Node/SSR, or a
 * browser without `matchMedia` support).
 */
export function getColorScheme(): ColorScheme | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

   if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return undefined;
}

export interface ScreenResolution {
  width: number;
  height: number;
}

/**
 * Returns the device's full screen resolution (`window.screen.width` x
 * `window.screen.height`), or `undefined` when it cannot be read (Node/SSR,
 * no `window.screen`, or either dimension is not a number).
 */
export function getScreenResolution(): ScreenResolution | undefined {
  if (
    typeof window === "undefined" ||
    typeof window.screen === "undefined" ||
    typeof window.screen.width !== "number" ||
    typeof window.screen.height !== "number"
  ) {
    return undefined;
  }

  return { width: window.screen.width, height: window.screen.height };
}