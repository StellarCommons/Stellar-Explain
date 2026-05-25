export const DEFAULT_HISTORY_LIMIT = 10;

export function applyLimit<T>(entries: T[], limit: number): T[] {
  return entries.slice(-Math.abs(limit));
}