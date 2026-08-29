import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsClient } from "../src/client";

interface FakeWindow {
  handlers: Record<string, () => void>;
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
}

const originalNavigator = globalThis.navigator;
const originalWindow = (globalThis as { window?: unknown }).window;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

function makeWindow(): FakeWindow {
  const handlers: Record<string, () => void> = {};
  return {
    handlers,
    addEventListener(type: string, handler: () => void) {
      handlers[type] = handler;
    },
    removeEventListener(type: string, handler: () => void) {
      if (handlers[type] === handler) delete handlers[type];
    },
  };
}

afterEach(() => {
  setNavigator(originalNavigator);
  setWindow(originalWindow);
  vi.unstubAllGlobals();
});

describe("AnalyticsClient flush on page unload", () => {
  it("flushes queued events via sendBeacon on pagehide", async () => {
    const win = makeWindow();
    setWindow(win);
    const sendBeacon = vi.fn();
    setNavigator({ sendBeacon });

    const client = new AnalyticsClient({
      endpoint: "https://api.example.com/events",
      onFlush: vi.fn(),
    });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);

    win.handlers["pagehide"]();

    expect(client.queueSize()).toBe(0);
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe("https://api.example.com/events");
    expect(blob).toBeInstanceOf(Blob);

    client.destroy();
  });

  it("falls back to a synchronous POST when sendBeacon is unavailable", () => {
    const win = makeWindow();
    setWindow(win);
    setNavigator({});

    const send = vi.fn();
    class FakeXMLHttpRequest {
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = send;
    }
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);

    const client = new AnalyticsClient({ endpoint: "https://api.example.com/events" });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);

    win.handlers["pagehide"]();

    expect(send).toHaveBeenCalledTimes(1);
    client.destroy();
  });

  it("sends only events that are still queued", () => {
    const win = makeWindow();
    setWindow(win);
    const sendBeacon = vi.fn();
    setNavigator({ sendBeacon });

    const client = new AnalyticsClient({ endpoint: "https://api.example.com/events" });
    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    client.track({ id: "2", name: "search", timestamp: new Date(), properties: { query: "abc" } });

    win.handlers["pagehide"]();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(client.queueSize()).toBe(0);
    client.destroy();
  });

  it("sends nothing when the queue is empty", () => {
    const win = makeWindow();
    setWindow(win);
    const sendBeacon = vi.fn();
    setNavigator({ sendBeacon });

    const client = new AnalyticsClient({
      endpoint: "https://api.example.com/events",
      onFlush: vi.fn(),
    });

    win.handlers["pagehide"]();

    expect(sendBeacon).not.toHaveBeenCalled();
    client.destroy();
  });

  it("does not register an unload handler when flushOnUnload is false", () => {
    const win = makeWindow();
    setWindow(win);
    const sendBeacon = vi.fn();
    setNavigator({ sendBeacon });

    // trackTimeOnPage also binds its own independent "pagehide" listener by
    // default (see clientTimingAuto.test.ts) — disabled here since this
    // test is only about the flushOnUnload listener, and the fake window
    // above (matching the other tests in this file) only tracks one
    // handler per event type.
    const client = new AnalyticsClient({
      endpoint: "https://api.example.com/events",
      flushOnUnload: false,
      trackTimeOnPage: false,
    });

    expect(win.handlers["pagehide"]).toBeUndefined();

    client.track({ id: "1", name: "page_view", timestamp: new Date() });
    expect(client.queueSize()).toBe(1);
    client.destroy();
  });
});