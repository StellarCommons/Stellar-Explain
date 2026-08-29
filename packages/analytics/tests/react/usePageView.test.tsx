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
import { usePageView } from "../../src/react/usePageView";
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

function PageViewTracker() {
  usePageView();
  return null;
}

describe("usePageView (Analytics #49)", () => {
  it("calls trackPageView with the current pathname on mount", () => {
    mockPathname = "/tx/abc123";
    const track = vi.fn();
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.trackPageView = track;

    mount(
      <AnalyticsProvider client={client}>
        <PageViewTracker />
      </AnalyticsProvider>,
    );

    expect(track).toHaveBeenCalledWith("/tx/abc123");
    expect(track).toHaveBeenCalledTimes(1);

    client.destroy();
  });

  it("calls trackPageView again when the pathname changes", () => {
    const track = vi.fn();
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.trackPageView = track;

    mockPathname = "/tx/abc123";
    mount(
      <AnalyticsProvider client={client}>
        <PageViewTracker />
      </AnalyticsProvider>,
    );

    mockPathname = "/account/GA5XYZ";
    rerender(
      <AnalyticsProvider client={client}>
        <PageViewTracker />
      </AnalyticsProvider>,
    );

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith("/account/GA5XYZ");

    client.destroy();
  });

  it("does not call trackPageView again on a re-render with the same pathname", () => {
    const track = vi.fn();
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    client.trackPageView = track;
    mockPathname = "/tx/abc123";

    mount(
      <AnalyticsProvider client={client}>
        <PageViewTracker />
      </AnalyticsProvider>,
    );
    rerender(
      <AnalyticsProvider client={client}>
        <PageViewTracker />
      </AnalyticsProvider>,
    );

    expect(track).toHaveBeenCalledTimes(1);

    client.destroy();
  });

  it("throws when used outside an AnalyticsProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      mount(<PageViewTracker />);
    }).toThrow("useAnalytics() must be used within an <AnalyticsProvider>.");

    errorSpy.mockRestore();
  });
});
