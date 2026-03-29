function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  /** Maximum number of additional attempts after the first call fails. */
  maxRetries: number;
  /** Base delay in ms before the first retry; doubles each subsequent retry. */
  retryDelay: number;
  /**
   * Optional predicate called with each thrown error.
   * Return `false` to stop retrying and re-throw immediately.
   * Defaults to always retrying.
   */
  shouldRetry?: (err: unknown) => boolean;
}

/**
 * Calls `fn` and retries up to `options.maxRetries` times on failure.
 * Delay before the n-th retry = `retryDelay * 2^(n-1)` (exponential backoff).
 * If `retryDelay` is 0, retries fire immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= options.maxRetries) break;
      if (options.shouldRetry !== undefined && !options.shouldRetry(err)) {
        throw err;
      }
      const delay = options.retryDelay * Math.pow(2, attempt);
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Runs `tasks` with at most `concurrency` promises active at a time.
 * Results are returned in the same order as the input array.
 * If a task rejects the rejection propagates — wrap tasks in try/catch
 * before passing them in if you need never-reject behaviour.
 */
export async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results = new Array<T>(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }

  const slots = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: slots }, worker));
  return results;
}

/** Returns true for a valid Stellar transaction hash (64 hex chars). */
export function isValidTransactionHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash);
}
