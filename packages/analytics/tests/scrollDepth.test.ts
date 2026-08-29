import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import {
  buildScrollDepthEvent,
  SCROLL_DEPTH_MILESTONES,
} from "../src/events/scroll-depth";
import { AnalyticsClient } from "../src/client";

describe("buildScrollDepthEvent", () => {
  it("builds a scroll_depth event with the milestone percent", () => {
    const event = buildScrollDepthEvent(50);

    expect(event.name).toBe("scroll_depth");
    expect(event.properties.percent).toBe(50);
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackScrollDepth", () => {
  it("queues a scroll_depth event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackScrollDepth(100);

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("scroll_depth");
    expect(event.properties).toEqual({ percent: 100 });
    client.destroy();
  });
});

describe("Scroll depth milestones", () => {
  it("tracks 25%, 50%, 75%, and 100% milestones", () => {
    expect(SCROLL_DEPTH_MILESTONES).toEqual([25, 50, 75, 100]);
  });

  it("registers the scroll_depth event name", () => {
    expect(EventName).toContain("scroll_depth");
  });
});