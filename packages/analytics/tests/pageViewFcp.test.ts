import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { buildPageViewEvent } from "../src/events/page-view";

const originalPerformance = (globalThis as { performance?: unknown }).performance;

function setPerformance(value: unknown): void {
  Object.defineProperty(globalThis, "performance", { value, configurable: true });
}

afterEach(() => {
  setPerformance(originalPerformance);
});

describe("page view First Contentful Paint tracking", () => {
  it("attaches firstContentfulPaintMs when a paint entry is recorded", () => {
    setPerformance({
      getEntriesByType: () => [{ name: "first-contentful-paint", startTime: 250.75 }],
    });

    const event = buildPageViewEvent("/tx/abc123");

    expect(event.properties.path).toBe("/tx/abc123");
    expect(event.properties.firstContentfulPaintMs).toBe(250.75);
  });

  it("omits firstContentfulPaintMs when no paint entry exists", () => {
    setPerformance({ getEntriesByType: () => [] });

    const event = buildPageViewEvent("/tx/abc123");

    expect(event.properties.firstContentfulPaintMs).toBeUndefined();
  });
});

describe("AnalyticsClient page view FCP wiring", () => {
  it("attaches FCP timing via trackPageView", async () => {
    setPerformance({
      getEntriesByType: () => [{ name: "first-contentful-paint", startTime: 99.5 }],
    });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc123");

    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      path: "/tx/abc123",
      firstContentfulPaintMs: 99.5,
    });
  });
});