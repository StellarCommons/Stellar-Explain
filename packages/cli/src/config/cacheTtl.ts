// Closes #632: cache TTLs for offline/repeated lookups
// (transactions are immutable: 5 min; accounts can change: 60 sec).

export const TX_CACHE_TTL_MS = 5 * 60 * 1000;
export const ACCOUNT_CACHE_TTL_MS = 60 * 1000;

export type CacheableKind = 'tx' | 'account';

/** Returns the correct cache TTL in ms for a given lookup kind. */
export function getCacheTtl(kind: CacheableKind): number {
  return kind === 'tx' ? TX_CACHE_TTL_MS : ACCOUNT_CACHE_TTL_MS;
}
