import { AnalyticsEvent } from '../types.js';
import { isLocalStorageAvailable } from '../lib/storageAvailability.js';

const HEARTBEAT_STORAGE_KEY = 'stellar_analytics_last_heartbeat_date';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

/**
 * Analytics #68 — daily-active-user heartbeat dedup.
 *
 * Returns `true` exactly once per calendar day (UTC) across sessions,
 * by comparing against a date stamp persisted in localStorage. Once it
 * returns `true` for a given day, it records that day and returns `false`
 * for every subsequent call until the date rolls over.
 *
 * Fails open (returns `true`, without persisting) when localStorage is
 * unavailable, so a heartbeat still fires for the session rather than
 * silently disappearing when storage can't be used — the per-day cap
 * this function exists to provide just doesn't apply in that case.
 */
export function shouldFireHeartbeat(): boolean {
  if (!isLocalStorageAvailable()) return true;

  try {
    const today = todayDateString();
    if (localStorage.getItem(HEARTBEAT_STORAGE_KEY) === today) {
      return false;
    }
    localStorage.setItem(HEARTBEAT_STORAGE_KEY, today);
    return true;
  } catch {
    return true;
  }
}

export function createHeartbeatEvent(): AnalyticsEvent {
  return {
    name: 'daily_active_user',
    timestamp: Date.now(),
    properties: {},
  };
}
