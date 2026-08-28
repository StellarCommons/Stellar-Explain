import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsClient } from "../src/client";
import { OPT_OUT_STORAGE_KEY } from "../src/optout";

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

function setLocalStorage(value: unknown): void {
  Object.defineProperty(globalThis, "localStorage", { value, configurable: true });
}

function fakeLocalStorage(store: Record<string, string> = {}) {
  return { getItem: (key: string) => (key in store ? store[key] : null) };
}

afterEach(() => {
  setLocalStorage(originalLocalStorage);
});

describe("AnalyticsClient opt-out (localStorage)", () => {
  it("silently drops events when the opt-out flag is present", async () => {
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
    setLocalStorage(fakeLocalStorage());

    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });
});
