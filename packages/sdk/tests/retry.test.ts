import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { withRetry } from "../src/utils/index.js";
import { StellarExplainClient } from "../src/index.js";
import { NotFoundError } from "../src/errors/index.js";

// ── withRetry unit tests ────────────────────────────────────────────────────

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves on first attempt when fn succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn, { maxRetries: 3, retryDelay: 100 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and resolves if fn succeeds on 2nd attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 0 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts all retries and re-throws the last error", async () => {
    const error = new Error("persistent");
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2, retryDelay: 0 });
    // Attach rejection handler before advancing timers to avoid unhandled rejection warnings
    const assertion = expect(promise).rejects.toThrow("persistent");
    await vi.runAllTimersAsync();
    await assertion;

    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops retrying immediately when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new NotFoundError());

    const promise = withRetry(fn, {
      maxRetries: 3,
      retryDelay: 0,
      shouldRetry: (err) => !(err instanceof NotFoundError),
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── Client integration tests ────────────────────────────────────────────────

const VALID_HASH = "a".repeat(64); // 64 hex chars

describe("StellarExplainClient retry integration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("client with retries: 0 does not retry — fetch is called exactly once", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));

    const client = new StellarExplainClient({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchMock,
      retries: 0,
    });

    const promise = client.explainTransaction(VALID_HASH);
    const assertion = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("client with retries: 2 calls fetch up to 3 times total on persistent failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));

    const client = new StellarExplainClient({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchMock,
      retries: 2,
      retryDelay: 0,
    });

    const promise = client.explainTransaction(VALID_HASH);
    const assertion = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("NotFoundError propagates immediately — no retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new StellarExplainClient({
      baseUrl: "https://api.example.com",
      fetchImpl: fetchMock,
      retries: 2,
    });

    const promise = client.explainTransaction(VALID_HASH);
    const assertion = expect(promise).rejects.toBeInstanceOf(NotFoundError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
