import { describe, it, expect } from "vitest";
import { AnalyticsClient } from "../src/client";

describe("AnalyticsClient.group (issue #86)", () => {
  it("attaches the group id and properties to every subsequent event", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.group("org-42", { plan: "enterprise", seats: 50 });
    client.track({ id: "1", name: "page_view", timestamp: new Date(), properties: { path: "/tx/abc" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { groupId?: string; properties?: Record<string, unknown> };
    expect(event.groupId).toBe("org-42");
    expect(event.properties).toMatchObject({
      plan: "enterprise",
      seats: 50,
      path: "/tx/abc",
    });
  });

  it("works with no group properties, attaching only the id", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.group("org-42");
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { groupId?: string };
    expect(event.groupId).toBe("org-42");
  });

  it("lets an event's own property win over a group property with the same key", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.group("org-42", { plan: "enterprise" });
    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { plan: "override" } });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.plan).toBe("override");
  });

  it("lets an event's own groupId win over the client's group context", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.group("org-42");
    client.track({
      id: "1",
      name: "page_view",
      timestamp: new Date(),
      groupId: "org-explicit",
    } as never);
    await client.flush();
    client.destroy();

    const event = flushed[0] as { groupId?: string };
    expect(event.groupId).toBe("org-explicit");
  });

  it("replaces the group context wholesale on a second group() call, not merging", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
    });

    client.group("org-1", { plan: "free" });
    client.group("org-2", { seats: 10 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { groupId?: string; properties?: Record<string, unknown> };
    expect(event.groupId).toBe("org-2");
    expect(event.properties?.plan).toBeUndefined();
    expect(event.properties?.seats).toBe(10);
  });

  it("leaves the event untouched when group() was never called", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { groupId?: string };
    expect(event.groupId).toBeUndefined();
  });
});
