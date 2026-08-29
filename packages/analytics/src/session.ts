/**
 * Session identity helpers.
 *
 * A fresh random session ID is generated for each browsing session and
 * persisted in `sessionStorage` so it survives reloads within the same tab
 * while naturally resetting when the tab (and therefore the session) ends.
 * Every lookup here is defensive: reading or writing storage can throw in
 * some environments (private browsing, storage disabled by policy) and is
 * treated the same as "no session id" rather than surfacing an error.
 */

/** sessionStorage key holding the current session ID. */
export const SESSION_ID_STORAGE_KEY = "stellar-explain-analytics-session-id";

/**
 * Returns the current session ID, generating and persisting a new one on
 * first use.
 *
 * Returns `undefined` when `sessionStorage` is unavailable (Node/SSR) or the
 * storage access throws, so the analytics pipeline never crashes.
 */
export function getSessionId(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;

  try {
    const existing = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;

    const id = newSessionId();
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id);
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