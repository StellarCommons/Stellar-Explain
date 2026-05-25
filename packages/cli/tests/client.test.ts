import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "../src/lib/client.js";
import { NetworkError, NotFoundError } from "../src/lib/errors.js";

const defaultOpts = {
  baseUrl: "http://localhost:4000",
  timeout: 5000,
  verbose: false,
};

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn(() =>
    Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("createClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Success cases ──────────────────────────────────────────────

  describe("success", () => {
    it("getTransaction returns parsed JSON", async () => {
      const tx = {
        hash: "abc123",
        summary: "Payment of 100 XLM",
        status: "success",
        ledger: 12345,
        created_at: "2025-01-01T00:00:00Z",
        fee_charged: "100",
        memo: null,
        payments: [],
        skipped_operations: 0,
      };
      vi.stubGlobal("fetch", mockFetchResponse(200, tx));

      const client = createClient(defaultOpts);
      const result = await client.getTransaction("abc123");

      expect(result).toEqual(tx);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:4000/tx/abc123",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("getAccount returns parsed JSON", async () => {
      const account = {
        account_id: "GABC",
        summary: "Account with 3 balances",
        last_modified_ledger: 99999,
        subentry_count: 2,
        balances: [],
        signers: [],
      };
      vi.stubGlobal("fetch", mockFetchResponse(200, account));

      const client = createClient(defaultOpts);
      const result = await client.getAccount("GABC");

      expect(result).toEqual(account);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:4000/account/GABC",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("getHealth returns parsed JSON", async () => {
      const health = { status: "ok", horizon_reachable: true, version: "1.0.0" };
      vi.stubGlobal("fetch", mockFetchResponse(200, health));

      const client = createClient(defaultOpts);
      const result = await client.getHealth();

      expect(result).toEqual(health);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:4000/health",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  // ── 404 Not Found ──────────────────────────────────────────────

  describe("404 response", () => {
    it("throws NotFoundError", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(404, { error: "not found" }));

      const client = createClient(defaultOpts);

      await expect(client.getTransaction("missing")).rejects.toThrow(NotFoundError);
      await expect(client.getTransaction("missing")).rejects.toThrow(
        "Not found: http://localhost:4000/tx/missing",
      );
    });
  });

  // ── 429 Rate Limited ───────────────────────────────────────────

  describe("429 response", () => {
    it("throws NetworkError with HTTP 429", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(429, { error: "rate limit" }));

      const client = createClient(defaultOpts);

      await expect(client.getHealth()).rejects.toThrow(NetworkError);
      await expect(client.getHealth()).rejects.toThrow(
        "HTTP 429: http://localhost:4000/health",
      );
    });
  });

  // ── Timeout ────────────────────────────────────────────────────

  describe("timeout", () => {
    it("throws NetworkError when request is aborted", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(abortError)),
      );

      const client = createClient(defaultOpts);

      await expect(client.getTransaction("abc")).rejects.toThrow(NetworkError);
      await expect(client.getTransaction("abc")).rejects.toThrow(
        `Request timed out after ${defaultOpts.timeout}ms`,
      );
    });
  });

  // ── Network error ──────────────────────────────────────────────

  describe("network error", () => {
    it("throws NetworkError wrapping the original message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
      );

      const client = createClient(defaultOpts);

      await expect(client.getHealth()).rejects.toThrow(NetworkError);
      await expect(client.getHealth()).rejects.toThrow("Request failed: Failed to fetch");
    });
  });

  // ── Verbose logging ────────────────────────────────────────────

  describe("verbose mode", () => {
    it("writes request details to stderr", async () => {
      const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      vi.stubGlobal("fetch", mockFetchResponse(200, { status: "ok" }));

      const client = createClient({ ...defaultOpts, verbose: true });
      await client.getHealth();

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[verbose\] .*\/health 200 \d+ms\n/),
      );

      writeSpy.mockRestore();
    });

    it("does not write to stderr when verbose is false", async () => {
      const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      vi.stubGlobal("fetch", mockFetchResponse(200, { status: "ok" }));

      const client = createClient({ ...defaultOpts, verbose: false });
      await client.getHealth();

      expect(writeSpy).not.toHaveBeenCalled();

      writeSpy.mockRestore();
    });
  });
});
