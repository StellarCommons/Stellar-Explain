/** Returns true when running inside a browser environment (SSR-safe). */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}
