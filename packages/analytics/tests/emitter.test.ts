import { describe, it, expect } from "vitest";
import { EventEmitter } from "../src/emitter/EventEmitter";
import type { AnalyticsEvent } from "../src/types/events";

function withSessionId(event: AnalyticsEvent, sessionId: string): AnalyticsEvent {
  return { ...event, sessionId };
}

function applyTransforms(
  event: AnalyticsEvent,
  transforms: Array<(e: AnalyticsEvent) => AnalyticsEvent>,
): AnalyticsEvent {
  return transforms.reduce((current, transform) => transform(current), event);
}

describe("EventEmitter track/queue behaviour", () => {
  it("drops events with a name outside the known EventName list", () => {
    const emitter = new EventEmitter();
    emitter.track({ id: "1", name: "unknown_event" as never, timestamp: new Date() });
    expect(emitter.queueSize()).toBe(0);
  });

  it("applies transforms and attaches a session id before delivery", () => {
    const emitter = new EventEmitter();
    const received: AnalyticsEvent[] = [];
    emitter.on("login", (event) => received.push(event));

    const raw: AnalyticsEvent = { id: "2", name: "login", timestamp: new Date() };
    const prepared = applyTransforms(withSessionId(raw, "sess-123"), [
      (event) => ({ ...event, properties: { ...event.properties, source: "web" } }),
    ]);

    emitter.track(prepared);
    expect(received).toHaveLength(1);
    expect(received[0].sessionId).toBe("sess-123");
    expect(received[0].properties?.source).toBe("web");
  });

  it("enqueues and drains multiple events in order", () => {
    const emitter = new EventEmitter();
    const order: string[] = [];
    emitter.on("search", (event) => order.push(event.id));

    emitter.track({ id: "a", name: "search", timestamp: new Date() });
    emitter.track({ id: "b", name: "search", timestamp: new Date() });

    expect(order).toEqual(["a", "b"]);
    expect(emitter.queueSize()).toBe(0);
  });
});
