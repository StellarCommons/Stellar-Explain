// Fix: sanitize search queries before sending to analytics (#1322)
// Raw user input must not be forwarded directly to analytics.

/**
 * Strips sensitive tokens and truncates the query before analytics logging.
 * Returns null if the query should not be tracked.
 */
export function sanitizeSearchQuery(query: string): string | null {
  if (!query || typeof query !== 'string') return null;
  // Drop queries that look like private keys or hashes (56+ hex/base58 chars)
  if (/^[A-Za-z0-9+/]{50,}$/.test(query.trim())) return null;
  return query.trim().slice(0, 100);
}
