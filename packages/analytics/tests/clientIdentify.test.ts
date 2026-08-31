import { describe, it, expect } from "vitest";
import { AnalyticsClient } from "../src/client";

describe("AnalyticsClient.identify (issue #85)", () => {
  it("merges identified properties into every subsequent event", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.identify({ plan: "pro", accountAge: 42 });
    client.track({ id: "1", name: "page_view", timestamp: new Date(), properties: { path: "/tx/abc" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties).toMatchObject({
      plan: "pro",
      accountAge: 42,
      path: "/tx/abc",
    });
  });

  it("lets an event's own property win over an identified one with the same key", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.identify({ plan: "pro" });
    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { plan: "override" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.plan).toBe("override");
  });

  it("is cumulative across multiple identify() calls", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.identify({ plan: "free" });
    client.identify({ accountAge: 7 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties).toMatchObject({ plan: "free", accountAge: 7 });
  });

  it("lets a later identify() call overwrite an earlier trait with the same key", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.identify({ plan: "free" });
    client.identify({ plan: "pro" });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.plan).toBe("pro");
  });

  it("leaves properties untouched when identify() was never called", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.plan).toBeUndefined();
  });
});
