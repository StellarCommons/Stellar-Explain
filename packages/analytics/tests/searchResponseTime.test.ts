import { describe, it, expect } from "vitest";
import { buildSearchEvent } from "../src/events/search";
import { AnalyticsClient } from "../src/client";

describe("search API response time tracking", () => {
  it("attaches responseTimeMs to the search event", () => {
    const event = buildSearchEvent("tx", "abc123", 320);

    expect(event.name).toBe("search");
    expect(event.properties).toMatchObject({
      type: "tx",
      identifier: "abc123",
      responseTimeMs: 320,
    });
  });

  it("omits responseTimeMs when it is unknown", () => {
    const event = buildSearchEvent("account", "GA5XYZ");
    expect(event.properties.responseTimeMs).toBeUndefined();
  });
});

describe("AnalyticsClient.trackSearch response time", () => {
  it("records the API call duration on the queued search event", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackSearch("tx", "abc123", 418);

    await client.flush();
    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("search");
    expect(event.properties).toMatchObject({
      type: "tx",
      identifier: "abc123",
      responseTimeMs: 418,
    });
    client.destroy();
  });
});