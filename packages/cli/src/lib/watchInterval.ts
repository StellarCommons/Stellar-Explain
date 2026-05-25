export const DEFAULT_WATCH_INTERVAL_MS = 3000;

export function resolveInterval(flag?: number): number {
  return flag ?? DEFAULT_WATCH_INTERVAL_MS;
}