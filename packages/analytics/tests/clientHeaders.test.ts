import { describe, it, expect, vi, afterEach } from "vitest";
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AnalyticsClient custom headers (Analytics #45)", () => {
  it("merges custom headers on top of Content-Type in the batched fetch request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const client = new AnalyticsClient({
      endpoint: "https://api.example.com/events",
      fetchImpl,
      headers: { Authorization: "Bearer token-123", "X-Client": "web" },
    });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/events",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
          "X-Client": "web",
        },
      }),
    );
  });

  it("defaults to Content-Type only when no custom headers are configured", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const client = new AnalyticsClient({ endpoint: "https://api.example.com/events", fetchImpl });

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    await client.flush();
    client.destroy();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/events",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it("applies custom headers to the XHR unload-flush fallback when sendBeacon is unavailable", () => {
    setWindow({
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    setNavigator({});

    const setRequestHeader = vi.fn();
    const send = vi.fn();
    class FakeXMLHttpRequest {
      open = vi.fn();
      setRequestHeader = setRequestHeader;
      send = send;
    }
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);

    const client = new AnalyticsClient({
      endpoint: "https://api.example.com/events",
      headers: { Authorization: "Bearer token-123" },
    });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });

    // Simulate the pagehide handler firing directly (no real window event system here).
    (client as unknown as { _flushOnUnload: () => void })._flushOnUnload();

    expect(setRequestHeader).toHaveBeenCalledWith("Content-Type", "application/json");
    expect(setRequestHeader).toHaveBeenCalledWith("Authorization", "Bearer token-123");
    expect(send).toHaveBeenCalledTimes(1);

    client.destroy();
  });
});
