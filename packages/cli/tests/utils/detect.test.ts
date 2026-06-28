import { detectInputType } from "../../src/utils/detect";

describe("detectInputType", () => {
  it("detects a valid 64-char tx hash", () => {
    const hash = "a".repeat(64);
    expect(detectInputType(hash)).toBe("transaction");
  });

  it("detects a valid G-address", () => {
    expect(detectInputType("G" + "A".repeat(55))).toBe("account");
  });

  it("detects a federation address", () => {
    expect(detectInputType("alice*stellar.org")).toBe("federation");
  });

  it("returns unknown for empty string", () => {
    expect(detectInputType("")).toBe("unknown");
  });

  it("returns unknown for garbage input", () => {
    expect(detectInputType("not-valid-!!")).toBe("unknown");
  });
});
