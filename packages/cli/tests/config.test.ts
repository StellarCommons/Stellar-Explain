import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveBaseUrl } from "../src/lib/config.js";

const DEFAULT = "http://localhost:8080";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveBaseUrl", () => {
  it("returns the flag value when provided", () => {
    expect(resolveBaseUrl("https://custom.example.com")).toBe("https://custom.example.com");
  });

  it("returns STELLAR_EXPLAIN_URL env var when no flag", () => {
    vi.stubEnv("STELLAR_EXPLAIN_URL", "https://env.example.com");
    expect(resolveBaseUrl()).toBe("https://env.example.com");
  });

  it("returns the default URL when neither flag nor env var is set", () => {
    delete process.env["STELLAR_EXPLAIN_URL"];
    expect(resolveBaseUrl()).toBe(DEFAULT);
  });

  it("prefers flag over env var", () => {
    vi.stubEnv("STELLAR_EXPLAIN_URL", "https://env.example.com");
    expect(resolveBaseUrl("https://flag.example.com")).toBe("https://flag.example.com");
  });
});
