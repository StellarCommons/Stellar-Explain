import { describe, it, expect, afterEach, vi } from "vitest";
import { AnalyticsClient } from "../src/client";

interface FakeWindow {
  handlers: Record<string, () => void>;
  innerHeight: number;
  scrollY: number;
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
}

const originalWindow = (globalThis as { window?: unknown }).window;
const originalDocument = (globalThis as { document?: unknown }).document;

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

function setDocument(value: unknown): void {
  Object.defineProperty(globalThis, "document", { value, configurable: true });
}

function makeWindow(): FakeWindow {
  const handlers: Record<string, () => void> = {};
  return {
    handlers,
    innerHeight: 600,
    scrollY: 0,
    addEventListener(type: string, handler: () => void) {
      handlers[type] = handler;
    },
    removeEventListener(type: string, handler: () => void) {
      if (handlers[type] === handler) delete handlers[type];
    },
  };
}

afterEach(() => {
  setWindow(originalWindow);
  setDocument(originalDocument);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AnalyticsClient automatic scroll depth tracking", () => {
  it("emits scroll_depth events as each milestone is reached", async () => {
    const win = makeWindow();
    win.innerHeight = 600;
    setWindow(win);
    setDocument({ documentElement: { scrollHeight: 1400 } });
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => cb());

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    // scroll to 25% (200 / 800 scrollable)
    win.scrollY = 200;
    win.handlers["scroll"]();
    // scroll to 50% and 75%
    win.scrollY = 400;
    win.handlers["scroll"]();
    win.scrollY = 600;
    win.handlers["scroll"]();
    // scroll to 100%
    win.scrollY = 800;
    win.handlers["scroll"]();

    await client.flush();
    client.destroy();

    const names = (flushed as { name?: string; properties?: Record<string, unknown> }[]).map(
      (event) => event.properties?.percent,
    );
    expect(names).toEqual([25, 50, 75, 100]);
  });

  it("does not emit the same milestone twice", async () => {
    const win = makeWindow();
    win.innerHeight = 600;
    setWindow(win);
    setDocument({ documentElement: { scrollHeight: 1400 } });
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => cb());

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    win.scrollY = 200;
    win.handlers["scroll"]();
    win.scrollY = 220;
    win.handlers["scroll"]();

    await client.flush();
    client.destroy();

    const milestones = (flushed as { properties?: Record<string, unknown> }[]).filter(
      (event) => event.properties?.percent === 25,
    );
    expect(milestones).toHaveLength(1);
  });
});

describe("AnalyticsClient automatic time-on-page tracking", () => {
  it("records elapsed seconds when the page is hidden", async () => {
    const win = makeWindow();
    setWindow(win);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc123");
    nowSpy.mockReturnValue(1_006_000); // 6 seconds later
    win.handlers["pagehide"]();

    await client.flush();
    client.destroy();

    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("time_on_page");
    expect(event.properties).toEqual({ seconds: 6 });
    nowSpy.mockRestore();
  });

  it("does not emit time_on_page when no page was viewed", async () => {
    const win = makeWindow();
    setWindow(win);

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    win.handlers["pagehide"]();

    await client.flush();
    client.destroy();

    expect(flushed).toHaveLength(0);
  });
});