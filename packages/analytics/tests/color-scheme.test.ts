import { describe, it, expect, afterEach, vi } from 'vitest';
import { getColorSchemeContext } from '../src/context/color-scheme';

function mockWindowMatchMedia(matchesFor: Record<string, boolean>) {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: matchesFor[query] ?? false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe('getColorSchemeContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports "dark" when the dark media query matches', () => {
    mockWindowMatchMedia({ '(prefers-color-scheme: dark)': true });
    expect(getColorSchemeContext()).toEqual({ colorScheme: 'dark' });
  });

  it('reports "light" when the light media query matches', () => {
    mockWindowMatchMedia({ '(prefers-color-scheme: light)': true });
    expect(getColorSchemeContext()).toEqual({ colorScheme: 'light' });
  });

  it('reports "no-preference" when neither media query matches', () => {
    mockWindowMatchMedia({});
    expect(getColorSchemeContext()).toEqual({ colorScheme: 'no-preference' });
  });

  it('reports "no-preference" when window is unavailable (SSR)', () => {
    expect(getColorSchemeContext()).toEqual({ colorScheme: 'no-preference' });
  });
});
