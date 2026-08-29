import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("AnalyticsClient locale attachment (Analytics #33)", () => {
  it("attaches locale to every tracked event", async () => {
    setNavigator({ language: "en-US" });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { type: "tx", identifier: "abc" } });
    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      locale: "en-US",
    });
  });

  it("leaves locale out when navigator.language is unavailable", async () => {
    setNavigator({});

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "login", timestamp: new Date() });
    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties?.locale,
    ).toBeUndefined();
  });
});
