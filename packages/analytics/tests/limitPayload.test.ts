import { describe, it, expect } from "vitest";
import { limitPayload } from "../src/limitPayload";
import { AnalyticsEvent } from "../src/types/events";

const makeEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: "evt-001",
  name: "page_view",
  timestamp: new Date("2024-01-15T12:00:00.000Z"),
  userId: "user-42",
  sessionId: "session-abc",
  ...overrides,
});

describe("limitPayload", () => {
  describe("events under the limit", () => {
    it("returns the same event reference when there are no properties", () => {
      const event = makeEvent({ properties: undefined });
      const result = limitPayload(event, 100);
      expect(result).toBe(event);
    });

    it("returns the same event reference when properties is an empty object", () => {
      const event = makeEvent({ properties: {} });
      const result = limitPayload(event, 100);
      expect(result).toBe(event);
    });

    it("returns the same event reference when all properties are within the limit", () => {
      const event = makeEvent({ properties: { key: "short" } });
      const result = limitPayload(event, 100);
      expect(result).toBe(event);
    });

    it("does not set _truncated on events within the limit", () => {
      const event = makeEvent({ properties: { label: "hello" } });
      const result = limitPayload(event, 100);
      expect(result.properties?._truncated).toBeUndefined();
    });

    it("preserves all property values when none exceed the limit", () => {
      const event = makeEvent({ properties: { a: "foo", b: "bar", c: 42 } });
      const result = limitPayload(event, 100);
      expect(result.properties).toEqual({ a: "foo", b: "bar", c: 42 });
    });

    it("preserves non-string property values regardless of limit", () => {
      const event = makeEvent({ properties: { count: 999, active: true, tags: ["x", "y"] } });
      const result = limitPayload(event, 5);
      expect(result.properties?.count).toBe(999);
      expect(result.properties?.active).toBe(true);
      expect(result.properties?.tags).toEqual(["x", "y"]);
    });
  });

  describe("events over the limit", () => {
    it("truncates a string property that exceeds the limit", () => {
      const longValue = "a".repeat(200);
      const event = makeEvent({ properties: { data: longValue } });
      const result = limitPayload(event, 100);
      const truncated = result.properties?.data as string;
      expect(truncated.length).toBeLessThan(longValue.length);
    });

    it("sets _truncated: true when any property is truncated", () => {
      const longValue = "x".repeat(500);
      const event = makeEvent({ properties: { payload: longValue } });
      const result = limitPayload(event, 100);
      expect(result.properties?._truncated).toBe(true);
    });

    it("does not mutate the original event", () => {
      const longValue = "y".repeat(500);
      const event = makeEvent({ properties: { data: longValue } });
      const original = event.properties?.data;
      limitPayload(event, 100);
      expect(event.properties?.data).toBe(original);
      expect(event.properties?._truncated).toBeUndefined();
    });

    it("returns a new event object when truncation occurs", () => {
      const longValue = "z".repeat(500);
      const event = makeEvent({ properties: { value: longValue } });
      const result = limitPayload(event, 100);
      expect(result).not.toBe(event);
    });

    it("only truncates string properties that exceed the limit, leaving others unchanged", () => {
      const event = makeEvent({
        properties: {
          short: "ok",
          long: "b".repeat(500),
          count: 42,
        },
      });
      const result = limitPayload(event, 100);
      expect(result.properties?.short).toBe("ok");
      expect(result.properties?.count).toBe(42);
      expect((result.properties?.long as string).length).toBeLessThanOrEqual(
        100 + "...[truncated]".length
      );
    });

    it("truncates multiple oversized string properties in one pass", () => {
      const event = makeEvent({
        properties: {
          first: "a".repeat(300),
          second: "b".repeat(400),
        },
      });
      const result = limitPayload(event, 50);
      expect(result.properties?._truncated).toBe(true);
      expect((result.properties?.first as string).startsWith("aaaa")).toBe(true);
      expect((result.properties?.second as string).startsWith("bbbb")).toBe(true);
    });

    it("uses the default limit of 1024 when no maxBytes is provided", () => {
      const exactly1025 = "c".repeat(1025);
      const event = makeEvent({ properties: { big: exactly1025 } });
      const result = limitPayload(event);
      expect(result.properties?._truncated).toBe(true);
    });

    it("does not truncate a string of exactly maxBytes length", () => {
      const exactly100 = "d".repeat(100);
      const event = makeEvent({ properties: { val: exactly100 } });
      const result = limitPayload(event, 100);
      expect(result).toBe(event);
      expect(result.properties?._truncated).toBeUndefined();
    });

    it("preserves all top-level event fields when truncation occurs", () => {
      const event = makeEvent({ properties: { data: "e".repeat(500) } });
      const result = limitPayload(event, 10);
      expect(result.id).toBe(event.id);
      expect(result.name).toBe(event.name);
      expect(result.timestamp).toBe(event.timestamp);
      expect(result.userId).toBe(event.userId);
      expect(result.sessionId).toBe(event.sessionId);
    });
  });
});
