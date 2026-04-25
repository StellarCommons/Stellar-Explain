import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { withRetry } from "../src/utils/index.js";

describe("withRetry sleep timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("retryDelay: 300 — exponential backoff", () => {
    it("1st retry fires after 300ms (300 * 2^0)", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      // suppress final rejection — this test only checks call-count timing
      withRetry(fn, { maxRetries: 3, retryDelay: 300 }).catch(() => undefined);

      // Initial call happens synchronously before any timer
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1);

      // Still waiting — 299 ms in, no retry yet
      await vi.advanceTimersByTimeAsync(299);
      expect(fn).toHaveBeenCalledTimes(1);

      // At 300 ms the first retry fires
      await vi.advanceTimersByTimeAsync(1);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("2nd retry fires after an additional 600ms (300 * 2^1)", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      withRetry(fn, { maxRetries: 3, retryDelay: 300 }).catch(() => undefined);

      // Advance past the 1st retry delay (300ms)
      await vi.advanceTimersByTimeAsync(300);
      expect(fn).toHaveBeenCalledTimes(2);

      // 599 ms into the second wait — still on 2nd call
      await vi.advanceTimersByTimeAsync(599);
      expect(fn).toHaveBeenCalledTimes(2);

      // At 600 ms the 2nd retry fires
      await vi.advanceTimersByTimeAsync(1);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("3rd retry fires after an additional 1200ms (300 * 2^2)", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      withRetry(fn, { maxRetries: 3, retryDelay: 300 }).catch(() => undefined);

      // Skip past the first two delays (300 + 600 = 900ms)
      await vi.advanceTimersByTimeAsync(900);
      expect(fn).toHaveBeenCalledTimes(3);

      // 1199 ms into the third wait — still on 3rd call
      await vi.advanceTimersByTimeAsync(1199);
      expect(fn).toHaveBeenCalledTimes(3);

      // At 1200 ms the 3rd retry fires
      await vi.advanceTimersByTimeAsync(1);
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  it("retryDelay: 0 — retries fire immediately with no timer delay", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxRetries: 2, retryDelay: 0 });

    // No time advancement needed — all retries should flush via microtasks
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
