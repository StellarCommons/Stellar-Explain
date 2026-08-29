import { describe, it, expect } from "vitest";
import { validateEvent } from "../src/validate";

function makeValidPageView(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-001",
    name: "page_view",
    timestamp: new Date(),
    ...overrides,
  };
}

describe("validateEvent", () => {
  it("accepts a valid page_view event", () => {
    expect(validateEvent(makeValidPageView())).toEqual({ valid: true });
  });

  it("accepts a valid search event", () => {
    expect(
      validateEvent({ id: "evt-002", name: "search", timestamp: new Date() }),
    ).toEqual({ valid: true });
  });

  it("rejects an event missing a required field (id)", () => {
    const result = validateEvent({ name: "page_view", timestamp: new Date() });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/id/);
  });

  it("rejects an event with a wrong field type (timestamp as string)", () => {
    const result = validateEvent(makeValidPageView({ timestamp: "2024-01-01" }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/timestamp/);
  });

  it("rejects an event with an unknown name", () => {
    const result = validateEvent(makeValidPageView({ name: "unknown_event" }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/name/);
  });

  it("rejects a non-object event", () => {
    expect(validateEvent(null).valid).toBe(false);
    expect(validateEvent("string").valid).toBe(false);
    expect(validateEvent([]).valid).toBe(false);
  });

  it("rejects event with array as properties", () => {
    const result = validateEvent(makeValidPageView({ properties: [1, 2, 3] }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/properties/);
  });
});
