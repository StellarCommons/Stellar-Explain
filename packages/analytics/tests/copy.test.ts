import { describe, it, expect } from "vitest";
import { buildCopyEvent } from "../src/events/copy";
import { AnalyticsClient } from "../src/client";

describe("buildCopyEvent", () => {
  it("builds a copy event for a field", () => {
    const event = buildCopyEvent("tx_hash");

    expect(event.name).toBe("button_click");
    expect(event.properties.field).toBe("tx_hash");
  });

  it("attaches optional preview and path", () => {
    const event = buildCopyEvent("account_address", {
      preview: "GA5XXXXX",
      path: "/accounts/GA5XYZ",
    });
    expect(event.properties).toMatchObject({
      field: "account_address",
      preview: "GA5XXXXX",
      path: "/accounts/GA5XYZ",
    });
  });
});

describe("AnalyticsClient.trackCopy", () => {
  it("queues a copy event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackCopy("tx_hash");

    await client.flush();
    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("button_click");
    expect(event.properties).toMatchObject({ field: "tx_hash" });
    client.destroy();
  });
});