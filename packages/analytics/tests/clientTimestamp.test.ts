import { describe, it, expect, vi, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { AnalyticsEvent } from "../src/types/events";

afterEach(() => {
  vi.useRealTimers();
});

describe("AnalyticsClient automatic timestamp stamping (Analytics #40)", () => {
  it("stamps the event with the current time, ignoring a caller-supplied timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    const staleTimestamp = new Date("2000-01-01T00:00:00.000Z");
    client.track({ id: "1", name: "login", timestamp: staleTimestamp });
    await client.flush();
    client.destroy();

    const event = flushed[0] as { timestamp?: Date };
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp?.toISOString()).toBe("2024-06-01T12:00:00.000Z");
  });

  it("still attaches a timestamp when the caller omits one entirely", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "login" } as unknown as AnalyticsEvent);
    await client.flush();
    client.destroy();

    const event = flushed[0] as { timestamp?: Date };
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("serializes the timestamp in ISO 8601 format on the wire (via JSON.stringify)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));

    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const client = new AnalyticsClient({ endpoint: "https://api.example.com/events", fetchImpl });

    client.track({ id: "1", name: "login", timestamp: new Date() });
    await client.flush();
    client.destroy();

    const [, init] = fetchImpl.mock.calls[0] as [string, { body: string }];
    const sentBatch = JSON.parse(init.body);
    expect(sentBatch[0].timestamp).toBe("2024-06-01T12:00:00.000Z");
  });
});
