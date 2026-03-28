/**
 * Provisional cache contract for future SDK cache integration.
 *
 * This is intentionally small because the surrounding cache architecture does
 * not exist in the current repository snapshot yet.
 */
export interface CacheAdapter {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
}
