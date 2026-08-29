import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildBackButtonEvent } from "../src/events/navigation";
import { AnalyticsClient } from "../src/client";

describe("buildBackButtonEvent", () => {
  it("builds a back_button event with the origin", () => {
    const event = buildBackButtonEvent("result");

    expect(event.name).toBe("back_button");
    expect(event.properties.from).toBe("result");
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackBackButton", () => {
  it("queues a back_button event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackBackButton("result");

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("back_button");
    expect(event.properties).toEqual({ from: "result" });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the back_button event name", () => {
    expect(EventName).toContain("back_button");
  });
});