import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildHistoryOpenEvent } from "../src/events/history";
import { AnalyticsClient } from "../src/client";

describe("buildHistoryOpenEvent", () => {
  it("builds a history_open event", () => {
    const event = buildHistoryOpenEvent();

    expect(event.name).toBe("history_open");
    expect(event.properties).toEqual({});
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackHistoryOpen", () => {
  it("queues a history_open event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackHistoryOpen();

    await client.flush();
    expect((flushed[0] as { name?: string }).name).toBe("history_open");
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the history_open event name", () => {
    expect(EventName).toContain("history_open");
  });
});