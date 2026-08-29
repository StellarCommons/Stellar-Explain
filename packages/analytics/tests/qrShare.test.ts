import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildQRShareEvent } from "../src/events/qr-share";
import { AnalyticsClient } from "../src/client";
import type { QRShareEvent } from "../src/events/qr-share";

describe("buildQRShareEvent", () => {
  it("builds a qr_share event with the shared resource type", () => {
    const event: QRShareEvent = buildQRShareEvent("address");

    expect(event.name).toBe("qr_share");
    expect(event.properties.type).toBe("address");
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackQRShare", () => {
  it("queues a qr_share event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackQRShare("tx");

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("qr_share");
    expect(event.properties).toEqual({ type: "tx" });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the qr_share event name", () => {
    expect(EventName).toContain("qr_share");
  });
});