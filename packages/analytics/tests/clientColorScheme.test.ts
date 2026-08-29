import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { buildPageViewEvent } from "../src/events/page-view";

const originalWindow = (globalThis as { window?: unknown }).window;

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

function fakeWindow(matchingQuery: string) {
  return {
    matchMedia: (query: string) => ({ matches: query === matchingQuery }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

afterEach(() => {
  setWindow(originalWindow);
});

describe("buildPageViewEvent colorScheme option", () => {
  it("attaches colorScheme when includeColorScheme is true", () => {
    setWindow(fakeWindow("(prefers-color-scheme: dark)"));

    const event = buildPageViewEvent("/tx/abc", { includeColorScheme: true });

    expect(event.properties.colorScheme).toBe("dark");
  });

  it("omits colorScheme when includeColorScheme is false (default)", () => {
    setWindow(fakeWindow("(prefers-color-scheme: dark)"));

    const event = buildPageViewEvent("/tx/abc");

    expect(event.properties.colorScheme).toBeUndefined();
  });
});

describe("AnalyticsClient color scheme wiring (Analytics #34)", () => {
  it("attaches colorScheme to the first page view of a session", async () => {
    setWindow(fakeWindow("(prefers-color-scheme: dark)"));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc");
    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      colorScheme: "dark",
    });
  });

  it("does not attach colorScheme to a second page view in the same session", async () => {
    setWindow(fakeWindow("(prefers-color-scheme: dark)"));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc");
    client.trackPageView("/tx/def");
    await client.flush();
    client.destroy();

    const second = flushed[1] as { properties?: Record<string, unknown> };
    expect(second.properties?.colorScheme).toBeUndefined();
  });
});
