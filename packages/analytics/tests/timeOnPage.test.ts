import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildTimeOnPageEvent } from "../src/events/time-on-page";
import { AnalyticsClient } from "../src/client";

describe("buildTimeOnPageEvent", () => {
  it("builds a time_on_page event with the elapsed seconds", () => {
    const event = buildTimeOnPageEvent(42);

    expect(event.name).toBe("time_on_page");
    expect(event.properties.seconds).toBe(42);
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackTimeOnPage", () => {
  it("queues a time_on_page event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackTimeOnPage(12);

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("time_on_page");
    expect(event.properties).toEqual({ seconds: 12 });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the time_on_page event name", () => {
    expect(EventName).toContain("time_on_page");
  });
});