/**
 * Analytics #69 — captures the viewer's light/dark preference from the
 * `prefers-color-scheme` media query, following the pattern established
 * by `getPageContext()` for shared, environment-derived context.
 */
export type ColorScheme = 'light' | 'dark' | 'no-preference';

export interface ColorSchemeContext {
  colorScheme: ColorScheme;
}

export function getColorSchemeContext(): ColorSchemeContext {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { colorScheme: 'no-preference' };
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return { colorScheme: 'dark' };
  }

  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return { colorScheme: 'light' };
  }

  return { colorScheme: 'no-preference' };
}
