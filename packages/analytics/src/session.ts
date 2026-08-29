/**
 * Session identity helpers.
 *
 * A fresh random session ID is generated for each browsing session and
 * persisted in `sessionStorage` so it survives reloads within the same tab.
 * A session also expires after `SESSION_INACTIVITY_TIMEOUT_MS` of inactivity
 * — even within the same tab — so a tab left open overnight starts a new
 * session the next time it's used, rather than reporting a day-long one.
 * Every lookup here is defensive: reading or writing storage can throw in
 * some environments (private browsing, storage disabled by policy) and is
 * treated the same as "no session id" rather than surfacing an error.
 */

/** sessionStorage key holding the current session ID. */
export const SESSION_ID_STORAGE_KEY = "stellar-explain-analytics-session-id";

/** sessionStorage key holding the timestamp (ms) of the session's last activity. */
export const SESSION_LAST_ACTIVE_STORAGE_KEY = "stellar-explain-analytics-session-last-active";

/** A session expires after this many milliseconds of inactivity. */
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Returns the current session ID, generating and persisting a new one on
 * first use or once the previous session has expired from inactivity.
 * Every call refreshes the "last active" timestamp, so the timeout is a
 * sliding window rather than a fixed session length.
 *
 * Returns `undefined` when `sessionStorage` is unavailable (Node/SSR) or the
 * storage access throws, so the analytics pipeline never crashes.
 *
 * @param now - Injectable clock, for testing. Defaults to `Date.now`.
 */
export function getSessionId(now: () => number = Date.now): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;

  try {
    const existing = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    const lastActiveRaw = sessionStorage.getItem(SESSION_LAST_ACTIVE_STORAGE_KEY);
    const currentTime = now();

    if (existing && lastActiveRaw !== null) {
      const lastActive = Number(lastActiveRaw);
      if (!Number.isNaN(lastActive) && currentTime - lastActive < SESSION_INACTIVITY_TIMEOUT_MS) {
        sessionStorage.setItem(SESSION_LAST_ACTIVE_STORAGE_KEY, String(currentTime));
        return existing;
      }
    }

    const id = newSessionId();
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id);
    sessionStorage.setItem(SESSION_LAST_ACTIVE_STORAGE_KEY, String(currentTime));
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Generates a fresh session ID backed by `crypto.randomUUID()`.
 *
 * Falls back to a random hex string when the Web Crypto API is unavailable
 * (older browsers, some SSR environments) so IDs are always produced.
 */
export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
