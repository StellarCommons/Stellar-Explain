import { describe, it, expect, vi, afterEach } from "vitest";
import { loadConfig, resolveBaseUrl } from "../src/lib/config.js";

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

describe("loadConfig", () => {
  it("warns once for insecure non-localhost HTTP base URLs", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.stubEnv("STELLAR_EXPLAIN_URL", "http://example.com");

    expect(loadConfig()).toEqual({ baseUrl: "http://example.com", timeout: 5000 });
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: base URL is set to a non-HTTPS URL (http://example.com)."),
    );

    writeSpy.mockRestore();
  });

  it("does not warn for localhost HTTP base URLs", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.stubEnv("STELLAR_EXPLAIN_URL", "http://localhost:3000");

    expect(loadConfig()).toEqual({ baseUrl: "http://localhost:3000", timeout: 5000 });
    expect(writeSpy).not.toHaveBeenCalled();

    writeSpy.mockRestore();
  });
});
