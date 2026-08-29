// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { act, ReactElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { AnalyticsProvider } from "../../src/react/provider";
import { useTrackEvent, TrackEventFn } from "../../src/react/useTrackEvent";
import { AnalyticsClient } from "../../src/client";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function mount(children: ReactElement): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(children);
  });
}

function rerender(children: ReactElement): void {
  act(() => {
    root!.render(children);
  });
}

beforeEach(() => {
  mockPathname = "/";
});

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = undefined;
  }
  if (container) {
    container.remove();
    container = undefined;
  }
  vi.restoreAllMocks();
});

function Capture({ onRender }: { onRender: (track: TrackEventFn) => void }) {
  onRender(useTrackEvent());
  return null;
}

describe("useTrackEvent (Analytics #50)", () => {
  it("tags a tracked event with the current pathname", () => {
    mockPathname = "/tx/abc123";
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });
    let track: TrackEventFn = () => {};

    mount(
      <AnalyticsProvider client={client}>
        <Capture onRender={(t) => (track = t)} />
      </AnalyticsProvider>,
    );

    act(() => track({ id: "1", name: "button_click", timestamp: new Date() }));

    expect(client.queueSize()).toBe(1);
    client.destroy();
  });

  it("does not overwrite a path the caller already set", async () => {
    mockPathname = "/tx/abc123";
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });
    let track: TrackEventFn = () => {};

    mount(
      <AnalyticsProvider client={client}>
        <Capture onRender={(t) => (track = t)} />
      </AnalyticsProvider>,
    );

    act(() =>
      track({
        id: "1",
        name: "button_click",
        timestamp: new Date(),
        properties: { field: "tx_hash", path: "/custom" },
      }),
    );
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties?.path).toBe("/custom");
  });

  it("fills in path on an event with other properties but no path", async () => {
    mockPathname = "/account/GA5XYZ";
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });
    let track: TrackEventFn = () => {};

    mount(
      <AnalyticsProvider client={client}>
        <Capture onRender={(t) => (track = t)} />
      </AnalyticsProvider>,
    );

    act(() =>
      track({
        id: "1",
        name: "button_click",
        timestamp: new Date(),
        properties: { field: "tx_hash" },
      }),
    );
    await client.flush();
    client.destroy();

    const event = flushed[0] as { properties?: Record<string, unknown> };
    expect(event.properties).toMatchObject({ field: "tx_hash", path: "/account/GA5XYZ" });
  });

  it("returns a new function identity when the pathname changes", () => {
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    const seen: TrackEventFn[] = [];

    mockPathname = "/a";
    mount(
      <AnalyticsProvider client={client}>
        <Capture onRender={(t) => seen.push(t)} />
      </AnalyticsProvider>,
    );

    mockPathname = "/b";
    rerender(
      <AnalyticsProvider client={client}>
        <Capture onRender={(t) => seen.push(t)} />
      </AnalyticsProvider>,
    );

    expect(seen[0]).not.toBe(seen[1]);
    client.destroy();
  });

  it("throws when used outside an AnalyticsProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      mount(<Capture onRender={() => {}} />);
    }).toThrow("useAnalytics() must be used within an <AnalyticsProvider>.");

    errorSpy.mockRestore();
  });
});
