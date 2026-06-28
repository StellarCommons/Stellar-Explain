import { formatJson } from "../../src/formatters/json";

describe("JSON formatter", () => {
  it("formats a transaction object as valid JSON", () => {
    const tx = { hash: "abc", ledger: 1 };
    const out = formatJson(tx);
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it("formats an account object correctly", () => {
    const acc = { id: "GABC", balances: [] };
    const out = formatJson(acc);
    const parsed = JSON.parse(out);
    expect(parsed.id).toBe("GABC");
  });

  it("handles null fields", () => {
    const out = formatJson({ a: null, b: undefined });
    const parsed = JSON.parse(out);
    expect(parsed.a).toBeNull();
  });

  it("formats nested structures", () => {
    const nested = { outer: { inner: { value: 42 } } };
    const out = formatJson(nested);
    expect(JSON.parse(out).outer.inner.value).toBe(42);
  });
});
