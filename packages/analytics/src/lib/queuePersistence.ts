import type { AnalyticsEvent } from '../types.js';
import { optOutManager } from '../optout.js';
import { isLocalStorageAvailable } from './storageAvailability.js';

/**
 * Persistence of the pending queue across page unloads.
 *
 * Guarded by the opt-out flag and storage availability; silently no-ops when
 * storage is unavailable or the user opted out.
 */

export const PENDING_QUEUE_STORAGE_KEY = 'stellar_analytics_pending_queue';
export const MAX_PERSISTED_EVENTS = 500;

export function persistPendingQueue(events: AnalyticsEvent[]): boolean {
  if (events.length === 0) return true;
  if (optOutManager.isOptedOut()) return false;
  if (!isLocalStorageAvailable()) return false;
  try {
    const slice = events.slice(0, MAX_PERSISTED_EVENTS);
    localStorage.setItem(PENDING_QUEUE_STORAGE_KEY, JSON.stringify(slice));
    return true;
  } catch {
    return false;
  }
}

export function loadPersistedQueue(): AnalyticsEvent[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAnalyticsEvent).slice(0, MAX_PERSISTED_EVENTS);
  } catch {
    return [];
  }
}

export function clearPersistedQueue(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(PENDING_QUEUE_STORAGE_KEY);
  } catch {
    // ignore storage failures; nothing to recover from
  }
}

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<AnalyticsEvent>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.properties === 'object' &&
    candidate.properties !== null
  );
}