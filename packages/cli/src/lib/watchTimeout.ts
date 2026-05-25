export const DEFAULT_WATCH_TIMEOUT_MS = 60000;

export function resolveWatchTimeout(flag?: number): number {
  return flag ?? DEFAULT_WATCH_TIMEOUT_MS;
}