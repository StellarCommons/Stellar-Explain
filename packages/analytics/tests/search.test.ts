import { describe, it, expect } from "vitest";
import { buildSearchEvent } from "../src/events/search";
import { AnalyticsClient } from "../src/client";

describe("buildSearchEvent", () => {
  it("builds a search event with the resource type and identifier", () => {
    const event = buildSearchEvent("tx", "abc123");

    expect(event.name).toBe("search");
    expect(event.properties.type).toBe("tx");
    expect(event.properties.identifier).toBe("abc123");
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.id).toBeTypeOf("string");
  });

  it("supports account lookups", () => {
    const event = buildSearchEvent("account", "GA5XYZ");
    expect(event.properties.type).toBe("account");
  });
});

describe("AnalyticsClient.trackSearch", () => {
  it("queues a search event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackSearch("tx", "abc123");

    await client.flush();
    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("search");
    expect(event.properties).toMatchObject({ type: "tx", identifier: "abc123" });
    client.destroy();
  });
});