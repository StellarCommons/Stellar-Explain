// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

// Required for React 18+'s act() to work outside of @testing-library/react,
// which normally sets this for you.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { act, ReactElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { AnalyticsProvider } from "../../src/react/provider";
import { useAnalytics } from "../../src/react/useAnalytics";
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

function TrackButton({ onRender }: { onRender: (client: AnalyticsClient) => void }) {
  const client = useAnalytics();
  onRender(client);
  return null;
}

describe("AnalyticsProvider / useAnalytics (Analytics #48)", () => {
  it("returns the client instance passed to AnalyticsProvider", () => {
    const client = new AnalyticsClient({ onFlush: vi.fn() });
    const seen: AnalyticsClient[] = [];

    mount(
      <AnalyticsProvider client={client}>
        <TrackButton onRender={(c) => seen.push(c)} />
      </AnalyticsProvider>,
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(client);

    client.destroy();
  });

  it("lets consumers call track() through the provided client", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    mount(
      <AnalyticsProvider client={client}>
        <TrackButton
          onRender={(c) => c.track({ id: "1", name: "page_view", timestamp: new Date() })}
        />
      </AnalyticsProvider>,
    );

    expect(client.queueSize()).toBe(1);
    client.destroy();
  });

  it("throws a descriptive error when used outside an AnalyticsProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      mount(<TrackButton onRender={() => {}} />);
    }).toThrow("useAnalytics() must be used within an <AnalyticsProvider>.");

    errorSpy.mockRestore();
  });

  it("gives nested providers their own independent client", () => {
    const outer = new AnalyticsClient({ onFlush: vi.fn() });
    const inner = new AnalyticsClient({ onFlush: vi.fn() });
    const seen: AnalyticsClient[] = [];

    mount(
      <AnalyticsProvider client={outer}>
        <AnalyticsProvider client={inner}>
          <TrackButton onRender={(c) => seen.push(c)} />
        </AnalyticsProvider>
      </AnalyticsProvider>,
    );

    expect(seen[0]).toBe(inner);

    outer.destroy();
    inner.destroy();
  });
});
