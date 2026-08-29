import { describe, it, expect } from "vitest";
import { AnalyticsClient } from "../src/client";

describe("AnalyticsClient globalProperties (Analytics #46)", () => {
  it("merges globalProperties into every event's properties", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
      globalProperties: { appVersion: "1.2.3", env: "production" },
    });

    client.track({ id: "1", name: "page_view", timestamp: new Date(), properties: { path: "/tx/abc" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties).toMatchObject({
      appVersion: "1.2.3",
      env: "production",
      path: "/tx/abc",
    });
  });

  it("lets an event's own property win over a global one with the same key", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
      globalProperties: { env: "production" },
    });

    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { env: "override" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.env).toBe("override");
  });

  it("leaves properties untouched when globalProperties is not configured", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.appVersion).toBeUndefined();
    expect(event.properties?.env).toBeUndefined();
  });

  it("does nothing when globalProperties is an empty object — same result as omitting it", async () => {
    const withEmpty: unknown[] = [];
    const clientWithEmpty = new AnalyticsClient({
      onFlush: (batch) => void withEmpty.push(...batch),
      globalProperties: {},
    });
    clientWithEmpty.track({ id: "1", name: "page_view", timestamp: new Date() });
    await clientWithEmpty.flush();
    clientWithEmpty.destroy();

    const withoutConfig: unknown[] = [];
    const clientWithoutConfig = new AnalyticsClient({
      onFlush: (batch) => void withoutConfig.push(...batch),
    });
    clientWithoutConfig.track({ id: "1", name: "page_view", timestamp: new Date() });
    await clientWithoutConfig.flush();
    clientWithoutConfig.destroy();

    const a = withEmpty[0] as { properties?: Record<string, unknown> };
    const b = withoutConfig[0] as { properties?: Record<string, unknown> };
    expect(a.properties).toEqual(b.properties);
  });
});
