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
import { InvalidInputError } from "../errors/index.js";

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
      results[i] = await tasks[i]!();
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

/**
 * Validates a Stellar transaction hash, throwing `InvalidInputError` if invalid.
 * Must be exactly 64 hexadecimal characters.
 */
export function validateTransactionHash(hash: string): void {
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    const preview = hash.length > 16 ? `${hash.slice(0, 16)}…` : hash;
    throw new InvalidInputError(`Invalid transaction hash: "${preview}"`);
  }
}

/**
 * Validates a Stellar account address, throwing `InvalidInputError` if invalid.
 * Must match the G-address format: G followed by 55 base-32 characters.
 */
export function validateAccountAddress(address: string): void {
  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    const preview = address.length > 16 ? `${address.slice(0, 16)}…` : address;
    throw new InvalidInputError(`Invalid account address: "${preview}"`);
  }
}

/** Resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` up to `retries` times on any thrown error.
 * Delay between attempts doubles each time (exponential backoff), starting at `delayMs`.
 * Pass `shouldRetry` to skip retrying on specific errors (e.g. 404s).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number,
  shouldRetry?: (err: unknown) => boolean
): Promise<T> {
  let attempt = 0;
  let currentDelay = delayMs;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || (shouldRetry && !shouldRetry(err))) throw err;
      await sleep(currentDelay);
      currentDelay *= 2;
      attempt++;
    }
  }
}

/**
 * Joins `baseUrl` and `path`, stripping any trailing slash from `baseUrl` first.
 */
export function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
