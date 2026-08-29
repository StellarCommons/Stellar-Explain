import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildResultViewEvent } from "../src/events/result-view";
import { AnalyticsClient } from "../src/client";

describe("buildResultViewEvent", () => {
  it("builds a result_view event for a successful render", () => {
    const event = buildResultViewEvent("tx", true);

    expect(event.name).toBe("result_view");
    expect(event.properties).toEqual({ type: "tx", success: true });
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("records a failed render of an account result", () => {
    const event = buildResultViewEvent("account", false);
    expect(event.properties).toEqual({ type: "account", success: false });
  });
});

describe("AnalyticsClient.trackResultView", () => {
  it("queues a result_view event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackResultView("account", true);

    await client.flush();
    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("result_view");
    expect(event.properties).toMatchObject({ type: "account", success: true });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the result_view event name", () => {
    expect(EventName).toContain("result_view");
  });
});