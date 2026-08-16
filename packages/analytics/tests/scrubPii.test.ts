import { describe, it, expect } from "vitest";

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, "[redacted-email]").replace(IPV4_RE, "[redacted-ip]");
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === "object") return scrubPii(value as Record<string, unknown>);
  return value;
}

/** Redacts emails and IPv4 addresses from a payload, including nested objects. */
export function scrubPii(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    result[key] = scrubValue(value);
  }
  return result;
}

describe("scrubPii", () => {
  it("redacts email addresses", () => {
    expect(scrubPii({ note: "contact user@example.com" })).toEqual({
      note: "contact [redacted-email]",
    });
  });

  it("redacts IPv4 addresses", () => {
    expect(scrubPii({ ip: "192.168.1.10" })).toEqual({ ip: "[redacted-ip]" });
  });

  it("scrubs nested objects", () => {
    expect(scrubPii({ user: { email: "a@b.com", ip: "10.0.0.1" } })).toEqual({
      user: { email: "[redacted-email]", ip: "[redacted-ip]" },
    });
  });

  it("leaves clean payloads unchanged", () => {
    const clean = { name: "login", count: 3 };
    expect(scrubPii(clean)).toEqual(clean);
  });
});
