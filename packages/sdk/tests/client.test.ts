import { describe, it, expect, vi } from "vitest";
import { StellarExplainClient } from "../src/client/StellarExplainClient.js";
import {
  InvalidInputError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
  TimeoutError,
} from "../src/errors/index.js";
import type {
  TransactionExplanation,
  AccountExplanation,
  HealthResponse,
} from "../src/types/index.js";

const VALID_HASH = "a".repeat(64);
const VALID_ADDRESS = "G" + "A".repeat(55);

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers },
      })
    )
  );
}

const TX: TransactionExplanation = {
  hash: VALID_HASH,
  summary: "Payment of 10 XLM",
  status: "success",
  ledger: 1,
  created_at: "2024-01-01T00:00:00Z",
  fee_charged: "100",
  memo: null,
  payments: [],
  skipped_operations: 0,
};

const ACCOUNT: AccountExplanation = {
  account_id: VALID_ADDRESS,
  summary: "Account summary",
  last_modified_ledger: 1,
  subentry_count: 0,
  balances: [],
  signers: [],
};

const HEALTH: HealthResponse = { status: "ok", horizon_reachable: true, version: "1.0.0" };

const ERROR_BODY = { error: { code: "ERR", message: "error" } };

function makeClient(fetchImpl: ReturnType<typeof vi.fn>) {
  return new StellarExplainClient({ baseUrl: "https://example.com", fetchImpl });
}

describe("StellarExplainClient", () => {
  it("explainTransaction with valid hash returns TransactionExplanation", async () => {
    const client = makeClient(mockFetch(200, TX));
    expect(await client.explainTransaction(VALID_HASH)).toEqual(TX);
  });

  it("explainTransaction with invalid hash throws InvalidInputError before fetch", async () => {
    const fetch = mockFetch(200, TX);
    const client = makeClient(fetch);
    await expect(client.explainTransaction("bad")).rejects.toBeInstanceOf(InvalidInputError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explainTransaction on 404 throws NotFoundError", async () => {
    const client = makeClient(mockFetch(404, ERROR_BODY));
    await expect(client.explainTransaction(VALID_HASH)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("explainTransaction on 429 throws RateLimitError", async () => {
    const client = makeClient(mockFetch(429, ERROR_BODY));
    await expect(client.explainTransaction(VALID_HASH)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("explainTransaction on 500 throws UpstreamError", async () => {
    const client = makeClient(mockFetch(500, ERROR_BODY));
    await expect(client.explainTransaction(VALID_HASH)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("explainTransaction with AbortError throws TimeoutError", async () => {
    const fetch = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    const client = makeClient(fetch);
    await expect(client.explainTransaction(VALID_HASH)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("second call with same hash uses cache — fetch called only once", async () => {
    const fetch = mockFetch(200, TX);
    const client = makeClient(fetch);
    await client.explainTransaction(VALID_HASH);
    await client.explainTransaction(VALID_HASH);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clearCache then same call fetches again", async () => {
    const fetch = mockFetch(200, TX);
    const client = makeClient(fetch);
    await client.explainTransaction(VALID_HASH);
    client.clearCache();
    await client.explainTransaction(VALID_HASH);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("explainAccount with valid address returns AccountExplanation", async () => {
    const client = makeClient(mockFetch(200, ACCOUNT));
    expect(await client.explainAccount(VALID_ADDRESS)).toEqual(ACCOUNT);
  });

  it("explainAccount with invalid address throws InvalidInputError", async () => {
    const fetch = mockFetch(200, ACCOUNT);
    const client = makeClient(fetch);
    await expect(client.explainAccount("bad")).rejects.toBeInstanceOf(InvalidInputError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("health returns HealthResponse", async () => {
    const client = makeClient(mockFetch(200, HEALTH));
    expect(await client.health()).toEqual(HEALTH);
  });
});
