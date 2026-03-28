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
