import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildTabSwitchEvent } from "../src/events/tab-switch";
import { AnalyticsClient } from "../src/client";

describe("buildTabSwitchEvent", () => {
  it("builds a tab_switch event with the from/to tabs", () => {
    const event = buildTabSwitchEvent("transaction", "account");

    expect(event.name).toBe("tab_switch");
    expect(event.properties).toEqual({ from: "transaction", to: "account" });
  });
});

describe("AnalyticsClient.trackTabSwitch", () => {
  it("queues a tab_switch event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackTabSwitch("account", "transaction");

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("tab_switch");
    expect(event.properties).toEqual({ from: "account", to: "transaction" });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the tab_switch event name", () => {
    expect(EventName).toContain("tab_switch");
  });
});