import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "../src/lib/retry.js";

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries the correct number of times before succeeding", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("fail");
      return "success";
    });

    const result = await withRetry(fn, 3, 0);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn(async () => { throw new Error("always fails"); });

    await expect(withRetry(fn, 2, 0)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("does not retry when retries=0", async () => {
    const fn = vi.fn(async () => { throw new Error("fail"); });

    await expect(withRetry(fn, 0, 0)).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("waits delayMs between attempts", async () => {
    vi.useFakeTimers();

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const promise = withRetry(fn, 1, 1000);
    await vi.runAllTimersAsync();
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((c) => c[1]);
    expect(delays).toContain(1000);

    vi.useRealTimers();
  });
});
