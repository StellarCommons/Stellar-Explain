import { describe, it, expect } from "vitest";
import { buildErrorEvent } from "../src/events/error";
import { AnalyticsClient } from "../src/client";

describe("buildErrorEvent", () => {
  it("builds an error_occurred event with a code", () => {
    const event = buildErrorEvent("TX_NOT_FOUND");

    expect(event.name).toBe("error_occurred");
    expect(event.properties.code).toBe("TX_NOT_FOUND");
    expect(event.properties.message).toBeUndefined();
  });

  it("attaches an optional message", () => {
    const event = buildErrorEvent("API_TIMEOUT", "upstream timed out");
    expect(event.properties.message).toBe("upstream timed out");
  });
});

describe("AnalyticsClient.trackError", () => {
  it("queues an error event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackError("API_TIMEOUT", "upstream timed out");

    await client.flush();
    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("error_occurred");
    expect(event.properties).toMatchObject({
      code: "API_TIMEOUT",
      message: "upstream timed out",
    });
    client.destroy();
  });
});