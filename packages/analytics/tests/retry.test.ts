import { describe, it, expect, vi } from "vitest";

async function withRetry<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

describe("withRetry", () => {
  it("retries the correct number of times with exponential delays", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const promise = withRetry(fn, 3, 100).catch((err) => err);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const error = await promise;

    expect(fn).toHaveBeenCalledTimes(3);
    expect(error).toBeInstanceOf(Error);
    vi.useRealTimers();
  });

  it("returns the result immediately when the first attempt succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, 3, 100)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
