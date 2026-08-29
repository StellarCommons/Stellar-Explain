import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildRetryEvent } from "../src/events/retry";
import { AnalyticsClient } from "../src/client";

describe("buildRetryEvent", () => {
  it("builds a retry event with the retried type and error code", () => {
    const event = buildRetryEvent("tx", "API_TIMEOUT");

    expect(event.name).toBe("retry");
    expect(event.properties).toEqual({ type: "tx", errorCode: "API_TIMEOUT" });
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackRetry", () => {
  it("queues a retry event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackRetry("search", "TX_NOT_FOUND");

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("retry");
    expect(event.properties).toMatchObject({ type: "search", errorCode: "TX_NOT_FOUND" });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the retry event name", () => {
    expect(EventName).toContain("retry");
  });
});