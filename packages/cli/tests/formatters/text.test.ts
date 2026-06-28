import { formatText } from "../../src/formatters/text";

const mockTx = {
  hash: "abc123",
  ledger: 50000000,
  created_at: "2024-01-01T00:00:00Z",
  source_account: "GABC1234",
  fee_charged: "100",
  operation_count: 1,
};

describe("text formatter", () => {
  it("renders all transaction fields", () => {
    const out = formatText(mockTx, "transaction");
    expect(out).toContain("abc123");
    expect(out).toContain("50000000");
  });

  it("handles missing optional fields gracefully", () => {
    const partial = { hash: "xyz", ledger: 1 };
    expect(() => formatText(partial, "transaction")).not.toThrow();
  });

  it("truncates long addresses", () => {
    const data = { account: "G" + "A".repeat(55) };
    const out = formatText(data, "account");
    expect(out.length).toBeLessThan(300);
  });
});
