import { describe, it, expect } from "vitest";
import { limitPayload, DEFAULT_MAX_BYTES } from "../src/utils/limitPayload";
import type { AnalyticsEvent } from "../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: "evt-limit",
    name: "search",
    timestamp: new Date("2024-05-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("limitPayload()", () => {
  describe("events under the byte limit", () => {
    it("returns the same event reference when there are no properties", () => {
      const event = makeEvent();
      expect(limitPayload(event)).toBe(event);
    });

    it("returns the same event reference when all props are within limit", () => {
      const event = makeEvent({ properties: { label: "short" } });
      expect(limitPayload(event)).toBe(event);
    });

    it("does not set _truncated on untouched events", () => {
      const event = makeEvent({ properties: { label: "short" } });
      const result = limitPayload(event);
      expect(result.properties?._truncated).toBeUndefined();
    });

    it("preserves non-string property values without modification", () => {
      const event = makeEvent({ properties: { count: 42, active: true } });
      const result = limitPayload(event);
      expect(result.properties?.count).toBe(42);
      expect(result.properties?.active).toBe(true);
    });
  });

  describe("events that exceed the byte limit", () => {
    const MAX = 10; // tiny limit for easy testing

    it("returns a new event object (not the same reference)", () => {
      const longString = "a".repeat(MAX + 1);
      const event = makeEvent({ properties: { big: longString } });
      expect(limitPayload(event, MAX)).not.toBe(event);
    });

    it("truncates a string property that exceeds maxBytes", () => {
      const longString = "x".repeat(MAX + 50);
      const event = makeEvent({ properties: { msg: longString } });
      const result = limitPayload(event, MAX);
      const encoded = new TextEncoder().encode(result.properties?.msg as string);
      expect(encoded.byteLength).toBeLessThanOrEqual(MAX);
    });

    it("sets _truncated: true on the properties object", () => {
      const longString = "z".repeat(MAX + 1);
      const event = makeEvent({ properties: { data: longString } });
      const result = limitPayload(event, MAX);
      expect(result.properties?._truncated).toBe(true);
    });

    it("leaves non-string values untouched when other props are truncated", () => {
      const longString = "q".repeat(MAX + 1);
      const event = makeEvent({ properties: { big: longString, num: 99 } });
      const result = limitPayload(event, MAX);
      expect(result.properties?.num).toBe(99);
    });

    it("truncates multiple oversized string properties", () => {
      const event = makeEvent({
        properties: {
          a: "a".repeat(MAX + 5),
          b: "b".repeat(MAX + 10),
          c: "short",
        },
      });
      const result = limitPayload(event, MAX);

      const encA = new TextEncoder().encode(result.properties?.a as string);
      const encB = new TextEncoder().encode(result.properties?.b as string);

      expect(encA.byteLength).toBeLessThanOrEqual(MAX);
      expect(encB.byteLength).toBeLessThanOrEqual(MAX);
      expect(result.properties?.c).toBe("short");
      expect(result.properties?._truncated).toBe(true);
    });

    it("preserves the original event properties unchanged", () => {
      const originalValue = "y".repeat(MAX + 1);
      const event = makeEvent({ properties: { data: originalValue } });
      limitPayload(event, MAX);
      // original must be untouched
      expect(event.properties?.data).toBe(originalValue);
    });
  });

  describe("default byte limit", () => {
    it("DEFAULT_MAX_BYTES is 1024", () => {
      expect(DEFAULT_MAX_BYTES).toBe(1024);
    });

    it("does not truncate a string of exactly 1024 bytes", () => {
      const exactly1024 = "a".repeat(1024);
      const event = makeEvent({ properties: { payload: exactly1024 } });
      const result = limitPayload(event);
      expect(result).toBe(event);
    });

    it("truncates a string of 1025 bytes", () => {
      const over1024 = "a".repeat(1025);
      const event = makeEvent({ properties: { payload: over1024 } });
      const result = limitPayload(event);
      const encoded = new TextEncoder().encode(result.properties?.payload as string);
      expect(encoded.byteLength).toBeLessThanOrEqual(1024);
      expect(result.properties?._truncated).toBe(true);
    });
  });
});
