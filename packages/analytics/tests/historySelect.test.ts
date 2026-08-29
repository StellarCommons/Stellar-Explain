import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildHistorySelectEvent } from "../src/events/history";
import { AnalyticsClient } from "../src/client";

describe("buildHistorySelectEvent", () => {
  it("builds a history_select event with the reloaded result type", () => {
    const event = buildHistorySelectEvent("tx");

    expect(event.name).toBe("history_select");
    expect(event.properties.type).toBe("tx");
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackHistorySelect", () => {
  it("queues a history_select event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackHistorySelect("account");

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("history_select");
    expect(event.properties).toMatchObject({ type: "account" });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the history_select event name", () => {
    expect(EventName).toContain("history_select");
  });
});