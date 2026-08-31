/**
 * Anonymous user identity helpers.
 *
 * A persistent, anonymous user ID is generated once and stored in
 * `localStorage` so returning visitors are tied to the same ID across tabs
 * and sessions -- while never exposing who they actually are. Lookups are
 * defensive and never throw.
 */

import { isOptedOutViaLocalStorage } from "./optout";
import { AnalyticsEvent } from "./types/events";

/** localStorage key holding the persistent anonymous user ID. */
export const USER_ID_STORAGE_KEY = "stellar-explain-analytics-user-id";

/**
 * Returns the persistent anonymous user ID, generating and storing a new one
 * on first use.
 *
 * When the user has opted out (via the localStorage opt-out flag), any
 * existing ID is removed and `undefined` is returned instead of generating
 * one — an opted-out user should not be left with a lingering identifier
 * from before they opted out.
 *
 * Returns `undefined` when `localStorage` is unavailable (Node/SSR) or the
 * storage access throws, so the analytics pipeline never crashes.
 */
export function getUserId(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;

  try {
    if (isOptedOutViaLocalStorage()) {
      localStorage.removeItem(USER_ID_STORAGE_KEY);
      return undefined;
    }

    const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) return existing;

    const id = newUserId();
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Generates a fresh anonymous user ID backed by `crypto.randomUUID()`.
 *
 * Falls back to a random hex string when the Web Crypto API is unavailable
 * so an ID is always produced.
 */
export function newUserId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Merges `identify()`-set user properties into an event's `properties`
 * (issue #85). An event's own properties always win on key collisions, and
 * the event is returned unchanged when no properties have been identified —
 * same rules `AnalyticsClient._attachGlobalProperties` already applies to
 * `config.globalProperties`.
 */
export function attachUserProperties(
  event: AnalyticsEvent,
  traits: Record<string, unknown> | undefined,
): AnalyticsEvent {
  if (!traits || Object.keys(traits).length === 0) return event;

  return {
    ...event,
    properties: {
      ...traits,
      ...event.properties,
    },
  };
}
