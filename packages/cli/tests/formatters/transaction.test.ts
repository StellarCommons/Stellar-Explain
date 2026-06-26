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
    expect(out).toContain("Transaction: abc123");
    expect(out).toContain("Status:      success");
    expect(out).toContain("Fee:         100 stroops");
    expect(out).not.toContain("Payments:");
    expect(out).not.toContain("Memo:");
  });

  it("renders memo when present", () => {
    const out = formatTransaction({ ...baseTx, memo: "hello" });
    expect(out).toContain("Memo:        hello");
  });

  it("renders skipped_operations when > 0", () => {
    const out = formatTransaction({ ...baseTx, skipped_operations: 2 });
    expect(out).toContain("Skipped ops: 2");
  });

  it("renders failed status", () => {
    const out = formatTransaction({ ...baseTx, status: "failed" });
    expect(out).toContain("Status:      failed");
  });

  it("renders ledger number", () => {
    const out = formatTransaction(baseTx);
    expect(out).toContain("Ledger:      1000");
  });

  it("renders created_at as closed timestamp", () => {
    const out = formatTransaction(baseTx);
    expect(out).toContain("Closed at:   2024-01-01T00:00:00Z");
  });
});

