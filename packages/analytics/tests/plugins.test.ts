import { describe, it, expect, vi, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { AnalyticsPlugin, runBeforeTrack, runAfterTrack } from "../src/plugins";
import { AnalyticsEvent } from "../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { id: "1", name: "page_view", timestamp: new Date(), ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runBeforeTrack (Analytics #47)", () => {
  it("returns the event unchanged when no plugin transforms it", () => {
    const event = makeEvent();
    const plugin: AnalyticsPlugin = { beforeTrack: () => undefined };
    expect(runBeforeTrack([plugin], event)).toBe(event);
  });

  it("threads the transformed event through multiple plugins in order", () => {
    const event = makeEvent({ properties: {} });
    const addA: AnalyticsPlugin = {
      beforeTrack: (e) => ({ ...e, properties: { ...e.properties, a: 1 } }),
    };
    const addB: AnalyticsPlugin = {
      beforeTrack: (e) => ({ ...e, properties: { ...e.properties, b: 2 } }),
    };
    const result = runBeforeTrack([addA, addB], event);
    expect(result.properties).toEqual({ a: 1, b: 2 });
  });

  it("skips a plugin whose beforeTrack throws, without blocking later plugins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: AnalyticsPlugin = {
      name: "broken",
      beforeTrack: () => {
        throw new Error("boom");
      },
    };
    const addA: AnalyticsPlugin = {
      beforeTrack: (e) => ({ ...e, properties: { ...e.properties, a: 1 } }),
    };
    const result = runBeforeTrack([broken, addA], makeEvent({ properties: {} }));
    expect(result.properties).toEqual({ a: 1 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("broken"), expect.any(Error));
  });

  it("ignores plugins without a beforeTrack hook", () => {
    const event = makeEvent();
    expect(runBeforeTrack([{}, { afterTrack: () => {} }], event)).toBe(event);
  });
});

describe("runAfterTrack (Analytics #47)", () => {
  it("calls every plugin's afterTrack with the given event", () => {
    const event = makeEvent();
    const a = vi.fn();
    const b = vi.fn();
    runAfterTrack([{ afterTrack: a }, { afterTrack: b }], event);
    expect(a).toHaveBeenCalledWith(event);
    expect(b).toHaveBeenCalledWith(event);
  });

  it("continues to later plugins when one afterTrack throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = vi.fn();
    runAfterTrack(
      [
        {
          afterTrack: () => {
            throw new Error("boom");
          },
        },
        { afterTrack: b },
      ],
      makeEvent(),
    );
    expect(b).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});

describe("AnalyticsClient plugin integration (Analytics #47)", () => {
  it("applies beforeTrack transformations before the event is enqueued", async () => {
    const flushed: unknown[] = [];
    const plugin: AnalyticsPlugin = {
      beforeTrack: (e) => ({ ...e, properties: { ...e.properties, injected: true } }),
    };
    const client = new AnalyticsClient({
      onFlush: (batch) => void flushed.push(...batch),
      plugins: [plugin],
    });

    client.track(makeEvent({ properties: {} }));
    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      injected: true,
    });
  });

  it("calls afterTrack with the fully enriched event once it's enqueued", () => {
    const seen: AnalyticsEvent[] = [];
    const plugin: AnalyticsPlugin = { afterTrack: (e) => seen.push(e) };
    const client = new AnalyticsClient({
      onFlush: vi.fn(),
      plugins: [plugin],
      globalProperties: { env: "test" },
    });

    client.track(makeEvent());
    client.destroy();

    expect(seen).toHaveLength(1);
    expect(seen[0].properties).toMatchObject({ env: "test" });
  });

  it("never calls afterTrack for an event dropped by sampling", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const afterTrack = vi.fn();
    const client = new AnalyticsClient({
      onFlush: vi.fn(),
      sampleRate: 0,
      plugins: [{ afterTrack }],
    });

    client.track(makeEvent());
    client.destroy();

    expect(afterTrack).not.toHaveBeenCalled();
  });
});
