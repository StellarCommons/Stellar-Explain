import { describe, it, expect } from "vitest";
import { formatTransaction } from "../../src/formatters/transaction.js";
import type { TransactionExplanation } from "../../src/types/index.js";

const baseTx: TransactionExplanation = {
  hash: "abc123",
  status: "success",
  summary: "A payment",
  ledger: 1000,
  created_at: "2024-01-01T00:00:00Z",
  fee_charged: "100",
  memo: null,
  payments: [],
  skipped_operations: 0,
};

describe("formatTransaction", () => {
  it("renders base fields", () => {
    const out = formatTransaction(baseTx);
    expect(out).toContain(`Transaction: ${baseTx.hash}`);
    expect(out).toContain(`Status:      ${baseTx.status}`);
    expect(out).toContain(`Fee:         ${baseTx.fee_charged} stroops`);
    expect(out).not.toContain("Payments:");
    expect(out).not.toContain("Memo:");
  });

  it("renders memo when present", () => {
    const out = formatTransaction({ ...baseTx, memo: "hello" });
    expect(out).toContain("Memo:        hello");
  });

  it("renders payments as a table with aligned columns", () => {
    const tx: TransactionExplanation = {
      ...baseTx,
      payments: [
        { from: "GAAA", to: "GBBB", amount: "10.00", asset: "XLM", summary: "" },
        { from: "GCCCCCCCC", to: "GD", amount: "9999.00", asset: "USDC", summary: "" },
      ],
    };
    const out = formatTransaction(tx);
    expect(out).toContain("Payments:");
    const lines = out.split("\n").filter((l) => l.startsWith("  ") && l.includes("→"));
    expect(lines).toHaveLength(2);
    // columns must be aligned — each line same length up to asset start
    const arrowIdx0 = lines[0].indexOf("→");
    const arrowIdx1 = lines[1].indexOf("→");
    expect(arrowIdx0).toBe(arrowIdx1);
  });

  it("renders skipped_operations when > 0", () => {
    const out = formatTransaction({ ...baseTx, skipped_operations: 2 });
    expect(out).toContain("Skipped ops: 2");
  });
});
