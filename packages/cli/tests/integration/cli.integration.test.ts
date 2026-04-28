import { describe, it, expect } from "vitest";
import { createClient } from "../../src/lib/client.js";
import { BASE_URL, VALID_TX_HASH, VALID_ACCOUNT_ID } from "./fixtures.js";

const RUN = process.env.STELLAR_EXPLAIN_INTEGRATION === "true";

const client = createClient({ baseUrl: BASE_URL, timeout: 10000, verbose: false });

describe.skipIf(!RUN)("integration: health", () => {
  it("GET /health returns ok status", async () => {
    const res = await client.getHealth();
    expect(res.status).toBe("ok");
    expect(typeof res.horizon_reachable).toBe("boolean");
    expect(typeof res.version).toBe("string");
  });
});

describe.skipIf(!RUN)("integration: transaction", () => {
  it("GET /tx/:hash returns a transaction explanation", async () => {
    const res = await client.getTransaction(VALID_TX_HASH);
    expect(res.hash).toBe(VALID_TX_HASH);
    expect(typeof res.summary).toBe("string");
    expect(["success", "failed"]).toContain(res.status);
  });
});

describe.skipIf(!RUN)("integration: account", () => {
  it("GET /account/:id returns an account explanation", async () => {
    const res = await client.getAccount(VALID_ACCOUNT_ID);
    expect(res.account_id).toBe(VALID_ACCOUNT_ID);
    expect(typeof res.summary).toBe("string");
    expect(Array.isArray(res.balances)).toBe(true);
  });
});
