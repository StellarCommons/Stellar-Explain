import { describe, it, expect } from "vitest";
import { validateTransactionHash, validateAccountAddress, buildUrl } from "../src/utils/index.js";
import { InvalidInputError } from "../src/errors/index.js";

describe("validateTransactionHash", () => {
  const valid64Hex = "a".repeat(64);

  it("accepts a valid 64-char lowercase hex hash", () => {
    expect(() => validateTransactionHash(valid64Hex)).not.toThrow();
  });

  it("accepts a valid 64-char uppercase hex hash", () => {
    expect(() => validateTransactionHash("A".repeat(64))).not.toThrow();
  });

  it("throws InvalidInputError for a 63-char hash", () => {
    expect(() => validateTransactionHash("a".repeat(63))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError for a 65-char hash", () => {
    expect(() => validateTransactionHash("a".repeat(65))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError for non-hex characters", () => {
    expect(() => validateTransactionHash("z".repeat(64))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError for an empty string", () => {
    expect(() => validateTransactionHash("")).toThrow(InvalidInputError);
  });
});

describe("validateAccountAddress", () => {
  // A valid G-address: G + 55 uppercase base-32 chars (A-Z, 2-7)
  const validAddress = "G" + "A".repeat(55);

  it("accepts a valid G-address", () => {
    expect(() => validateAccountAddress(validAddress)).not.toThrow();
  });

  it("throws InvalidInputError when address starts with wrong letter", () => {
    expect(() => validateAccountAddress("A" + "A".repeat(55))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError when address is too short", () => {
    expect(() => validateAccountAddress("G" + "A".repeat(54))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError when address is too long", () => {
    expect(() => validateAccountAddress("G" + "A".repeat(56))).toThrow(InvalidInputError);
  });

  it("throws InvalidInputError for a lowercase address", () => {
    expect(() => validateAccountAddress("g" + "a".repeat(55))).toThrow(InvalidInputError);
  });
});

describe("buildUrl", () => {
  it("removes trailing slash from base before joining", () => {
    expect(buildUrl("https://example.com/", "/api/tx")).toBe("https://example.com/api/tx");
  });

  it("joins base without trailing slash and path correctly", () => {
    expect(buildUrl("https://example.com", "/api/tx")).toBe("https://example.com/api/tx");
  });
});
