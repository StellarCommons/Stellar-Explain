import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsClient } from "../src/client";
import { OPT_OUT_STORAGE_KEY } from "../src/optout";

const originalNavigator = globalThis.navigator;
const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

function setLocalStorage(value: unknown): void {
  Object.defineProperty(globalThis, "localStorage", { value, configurable: true });
}

function fakeLocalStorage(store: Record<string, string> = {}) {
  return { getItem: (key: string) => (key in store ? store[key] : null) };
}

afterEach(() => {
  setNavigator(originalNavigator);
  setLocalStorage(originalLocalStorage);
});

describe("AnalyticsClient opt-out (localStorage)", () => {
  it("silently drops events when the opt-out flag is present", async () => {
    setNavigator({});
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "1" }));

    const onFlush = vi.fn();
    const client = new AnalyticsClient({ onFlush });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(0);

    await client.flush();
    client.destroy();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("tracks normally when the opt-out flag is absent", () => {
    setNavigator({});
    setLocalStorage(fakeLocalStorage());

    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });
});

describe("AnalyticsClient opt-out (Do Not Track)", () => {
  it("disables tracking when navigator.doNotTrack is '1'", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());

    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(0);
    client.destroy();
  });

  it("logs a debug message when DNT disables tracking and debug is enabled", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const client = new AnalyticsClient({ onFlush: vi.fn(), debug: true });
    client.destroy();

    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("Do Not Track"),
    );
    debugSpy.mockRestore();
  });

  it("does not log when debug is disabled (default)", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.destroy();

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("respects ignoreDnt to keep tracking enabled despite the DNT signal", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());

    const client = new AnalyticsClient({ onFlush: vi.fn(), ignoreDnt: true });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });
});
