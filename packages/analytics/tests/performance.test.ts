import { describe, it, expect, afterEach } from "vitest";
import { getFirstContentfulPaintMs } from "../src/performance";

const originalPerformance = (globalThis as { performance?: unknown }).performance;

function setPerformance(value: unknown): void {
  Object.defineProperty(globalThis, "performance", { value, configurable: true });
}

afterEach(() => {
  setPerformance(originalPerformance);
});

describe("getFirstContentfulPaintMs", () => {
  it("returns undefined when the Performance API is unavailable", () => {
    setPerformance(undefined);
    expect(getFirstContentfulPaintMs()).toBeUndefined();
  });

  it("returns undefined when no paint entry has been recorded", () => {
    setPerformance({ getEntriesByType: () => [] });
    expect(getFirstContentfulPaintMs()).toBeUndefined();
  });

  it("returns the first-contentful-paint start time", () => {
    setPerformance({
      getEntriesByType: (type: string) =>
        type === "paint"
          ? [
              { name: "first-paint", startTime: 80 },
              { name: "first-contentful-paint", startTime: 123.5 },
            ]
          : [],
    });
    expect(getFirstContentfulPaintMs()).toBe(123.5);
  });
});