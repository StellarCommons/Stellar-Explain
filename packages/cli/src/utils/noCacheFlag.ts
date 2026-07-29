// Closes #631: --no-cache flag to bypass the local response cache.

export interface NoCacheOptions {
  noCache?: boolean;
}

/**
 * Returns true when the local response cache should be bypassed for this
 * invocation. Wire into `explain.ts` by skipping `cacheGet`/`cacheSet` when
 * this returns true.
 */
export function shouldBypassCache(opts: NoCacheOptions): boolean {
  return opts.noCache === true;
}
