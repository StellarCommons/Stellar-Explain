import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";

const originalNavigator = globalThis.navigator;
const originalWindow = (globalThis as { window?: unknown }).window;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

afterEach(() => {
  setNavigator(originalNavigator);
  setWindow(originalWindow);
});

describe("AnalyticsClient environment attachment", () => {
  it("attaches deviceType, browser, and OS to every event when detectable", async () => {
    setWindow({
      innerWidth: 375,
      screen: { width: 390, height: 844 },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    setNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0.0.0",
    });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });

    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      deviceType: "mobile",
      browser: "Chrome",
      os: "Android",
      screenResolution: { width: 390, height: 844 },
    });
  });

  it("leaves properties unchanged when nothing is detectable", async () => {
    setWindow(undefined);
    setNavigator({});

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });

    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties,
    ).toBeUndefined();
  });

  it("merges environment metadata alongside existing properties", async () => {
    setWindow({
      innerWidth: 1024,
      screen: { width: 1920, height: 1080 },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    setNavigator({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/128.0 Edg/128.0",
    });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({
      id: "1",
      name: "search",
      timestamp: new Date(),
      properties: { query: "abc" },
    });

    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toEqual({
      query: "abc",
      deviceType: "desktop",
      browser: "Edge",
      os: "Windows",
    });
  });
});