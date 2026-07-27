import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleSink } from "../../src/sinks/ConsoleSink";
import type { AnalyticsEvent } from "../../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: "evt-001",
    name: "page_view",
    timestamp: new Date("2024-01-15T10:00:00.000Z"),
    ...overrides,
  };
}

describe("ConsoleSink.send()", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("calls console.log exactly once per event", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("outputs valid JSON", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    const raw = logSpy.mock.calls[0][0] as string;
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("output contains level: analytics", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.level).toBe("analytics");
  });

  it("output contains correct event name", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ name: "button_click" }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.event).toBe("button_click");
  });

  it("output contains event id", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ id: "test-id-123" }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.id).toBe("test-id-123");
  });

  it("output contains ISO timestamp", () => {
    const ts = new Date("2024-06-01T12:30:00.000Z");
    const sink = new ConsoleSink();
    sink.send(makeEvent({ timestamp: ts }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.timestamp).toBe("2024-06-01T12:30:00.000Z");
  });

  it("output contains userId when present", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ userId: "user-42" }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.userId).toBe("user-42");
  });

  it("userId is null when not provided", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.userId).toBeNull();
  });

  it("output contains sessionId when present", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ sessionId: "sess-99" }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.sessionId).toBe("sess-99");
  });

  it("sessionId is null when not provided", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.sessionId).toBeNull();
  });

  it("output contains properties when present", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ properties: { path: "/home", referrer: "google" } }));

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.properties).toEqual({ path: "/home", referrer: "google" });
  });

  it("properties defaults to empty object when absent", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.properties).toEqual({});
  });
});
