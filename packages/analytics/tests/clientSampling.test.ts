import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsClient } from "../src/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnalyticsClient sampling", () => {
  it("keeps every event when sampleRate is omitted (default)", () => {
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    for (let i = 0; i < 10; i++) {
      client.track({
        id: String(i),
        name: "page_view",
        timestamp: new Date(),
        properties: { seq: i },
      });
    }
    expect(client.queueSize()).toBe(10);
    client.destroy();
  });

  it("keeps every event at sampleRate 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const client = new AnalyticsClient({ onFlush: vi.fn(), sampleRate: 1 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });

  it("drops every event at sampleRate 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    const client = new AnalyticsClient({ onFlush: vi.fn(), sampleRate: 0 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(0);
    client.destroy();
  });

  it("keeps an event when the random draw is below the sample rate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    const client = new AnalyticsClient({ onFlush: vi.fn(), sampleRate: 0.5 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });

  it("drops an event when the random draw is above the sample rate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    const client = new AnalyticsClient({ onFlush: vi.fn(), sampleRate: 0.5 });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(0);
    client.destroy();
  });
});
