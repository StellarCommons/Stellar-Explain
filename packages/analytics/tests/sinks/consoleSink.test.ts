import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleSink } from "../../src/sinks/ConsoleSink";
import { AnalyticsEvent } from "../../src/types/events";

const makeEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: "evt-001",
  name: "page_view",
  timestamp: new Date("2024-01-15T12:00:00.000Z"),
  properties: { path: "/home" },
  userId: "user-42",
  sessionId: "session-abc",
  ...overrides,
});

describe("ConsoleSink", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls console.log once per event", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it("prefixes the log with [analytics]", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent());
    const [firstArg] = consoleSpy.mock.calls[0] as [string];
    expect(firstArg).toMatch(/^\[analytics\]/);
  });

  it("includes the event name in the log", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ name: "button_click" }));
    const [firstArg] = consoleSpy.mock.calls[0] as [string];
    expect(firstArg).toContain("button_click");
  });

  it("includes the ISO timestamp in the log", () => {
    const ts = new Date("2024-06-01T09:30:00.000Z");
    const sink = new ConsoleSink();
    sink.send(makeEvent({ timestamp: ts }));
    const [firstArg] = consoleSpy.mock.calls[0] as [string];
    expect(firstArg).toContain("2024-06-01T09:30:00.000Z");
  });

  it("passes event properties as the second argument", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ properties: { path: "/dashboard", ref: "nav" } }));
    const [, secondArg] = consoleSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(secondArg).toEqual({ path: "/dashboard", ref: "nav" });
  });

  it("passes an empty object as properties when properties is undefined", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ properties: undefined }));
    const [, secondArg] = consoleSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(secondArg).toEqual({});
  });

  it("logs each event independently when called multiple times", () => {
    const sink = new ConsoleSink();
    sink.send(makeEvent({ name: "login" }));
    sink.send(makeEvent({ name: "logout" }));
    expect(consoleSpy).toHaveBeenCalledTimes(2);

    const firstCall = consoleSpy.mock.calls[0] as [string];
    const secondCall = consoleSpy.mock.calls[1] as [string];
    expect(firstCall[0]).toContain("login");
    expect(secondCall[0]).toContain("logout");
  });

  it("logs different event names correctly", () => {
    const sink = new ConsoleSink();
    const eventNames = ["api_call", "error_occurred", "search", "purchase"] as const;

    for (const name of eventNames) {
      sink.send(makeEvent({ name }));
    }

    expect(consoleSpy).toHaveBeenCalledTimes(eventNames.length);
    eventNames.forEach((name, i) => {
      const [arg] = consoleSpy.mock.calls[i] as [string];
      expect(arg).toContain(name);
    });
  });

  it("formats the first argument with the pattern: [analytics] <name> <ISO-timestamp>", () => {
    const ts = new Date("2025-03-20T08:00:00.000Z");
    const sink = new ConsoleSink();
    sink.send(makeEvent({ name: "form_submit", timestamp: ts }));
    const [firstArg] = consoleSpy.mock.calls[0] as [string];
    expect(firstArg).toBe("[analytics] form_submit 2025-03-20T08:00:00.000Z");
  });
});
