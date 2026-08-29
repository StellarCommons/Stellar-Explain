import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("AnalyticsClient connection type attachment", () => {
  it("attaches connectionType to event properties when available", async () => {
    setNavigator({ connection: { effectiveType: "4g" } });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      connectionType: "4g",
    });
  });

  it("leaves properties unchanged when the Network Information API is unsupported", async () => {
    setNavigator({});

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties,
    ).toBeUndefined();
  });

  it("merges connectionType alongside existing event properties", async () => {
    setNavigator({ connection: { type: "wifi" } });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({
      id: "1",
      name: "search",
      timestamp: new Date(),
      properties: { query: "abc" },
    });
    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toEqual({
      query: "abc",
      connectionType: "wifi",
    });
  });
});
