import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../src/emitter/EventEmitter";
import type { AnalyticsEvent } from "../src/types/events";
import type { Logger } from "../src/lib/logger";

function fakeLogger(): Logger & { calls: Array<{ level: string; message: string }> } {
  const calls: Array<{ level: string; message: string }> = [];
  return {
    calls,
    debug: (message) => calls.push({ level: "debug", message }),
    info: (message) => calls.push({ level: "info", message }),
    warn: (message) => calls.push({ level: "warn", message }),
    error: (message) => calls.push({ level: "error", message }),
  };
}

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { id: "e1", name: "login", timestamp: new Date(), ...overrides };
}

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

describe("EventEmitter metrics (issue #97, #98)", () => {
  it("starts at all-zero metrics with a closed circuit", () => {
    const emitter = new EventEmitter();
    expect(emitter.metrics()).toEqual({
      totalTracked: 0,
      totalDropped: 0,
      totalFlushed: 0,
      queueSize: 0,
      sinkErrors: 0,
      deadLetterSize: 0,
      circuitState: "closed",
    });
  });

  it("counts a dropped unknown-name event and logs a warning via the injected logger", () => {
    const logger = fakeLogger();
    const emitter = new EventEmitter({ logger });

    emitter.track(makeEvent({ name: "not_a_real_event" as never }));

    expect(emitter.metrics().totalDropped).toBe(1);
    expect(emitter.metrics().totalTracked).toBe(0);
    expect(logger.calls).toContainEqual(
      expect.objectContaining({ level: "warn" }),
    );
  });

  it("counts totalTracked and totalFlushed for a successfully delivered event", async () => {
    const emitter = new EventEmitter();
    emitter.on("login", () => {});

    emitter.track(makeEvent());
    await emitter.flush();

    const metrics = emitter.metrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.totalFlushed).toBe(1);
    expect(metrics.sinkErrors).toBe(0);
  });
});

describe("EventEmitter async handler errors never propagate (issue #95)", () => {
  it("catches a rejected async handler instead of producing an unhandled rejection", async () => {
    const logger = fakeLogger();
    const emitter = new EventEmitter({ logger });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    emitter.on("login", async () => {
      throw new Error("HttpSink: server responded with 503");
    });

    // track() must not throw or reject — it's fire-and-forget from the caller's side.
    expect(() => emitter.track(makeEvent())).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unhandled).not.toHaveBeenCalled();
    expect(emitter.metrics().sinkErrors).toBe(1);
    expect(logger.calls.some((c) => c.level === "error")).toBe(true);

    process.off("unhandledRejection", unhandled);
  });

  it("populates the dead-letter queue for an event whose handler failed", async () => {
    const emitter = new EventEmitter();
    emitter.on("login", () => {
      throw new Error("boom");
    });
    const event = makeEvent({ id: "dlq-1" });

    emitter.track(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dlq = emitter.getDeadLetterQueue();
    expect(dlq).toHaveLength(1);
    expect(dlq[0].id).toBe("dlq-1");
  });

  it("keeps flushing later events even after an earlier one's handler throws", async () => {
    const emitter = new EventEmitter();
    const received: string[] = [];
    emitter.on("login", (event) => {
      if (event.id === "fail-me") throw new Error("boom");
      received.push(event.id);
    });

    emitter.track(makeEvent({ id: "fail-me" }));
    emitter.track(makeEvent({ id: "ok" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toEqual(["ok"]);
  });
});

describe("EventEmitter circuit breaker integration (issue #97)", () => {
  it("opens after 5 consecutive handler failures and stops attempting delivery", async () => {
    const emitter = new EventEmitter({ circuitBreaker: { failureThreshold: 5, cooldownMs: 60_000 } });
    let attempts = 0;
    emitter.on("login", () => {
      attempts++;
      throw new Error("boom");
    });

    for (let i = 0; i < 6; i++) {
      emitter.track(makeEvent({ id: `evt-${i}` }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(emitter.metrics().circuitState).toBe("open");
    // Only the 5 failures that actually reached the handler should have
    // attempted delivery — the 6th event is dropped by the open circuit
    // before ever reaching it.
    expect(attempts).toBe(5);
    expect(emitter.metrics().totalDropped).toBe(1);
  });

  it("allows delivery again once the cooldown elapses, closing the circuit on success", async () => {
    let now = 0;
    const emitter = new EventEmitter({
      circuitBreaker: { failureThreshold: 5, cooldownMs: 60_000, now: () => now },
    });
    let shouldFail = true;
    emitter.on("login", () => {
      if (shouldFail) throw new Error("boom");
    });

    for (let i = 0; i < 5; i++) {
      emitter.track(makeEvent({ id: `evt-${i}` }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(emitter.metrics().circuitState).toBe("open");

    shouldFail = false;
    now += 60_000;
    emitter.track(makeEvent({ id: "recovered" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(emitter.metrics().circuitState).toBe("closed");
    expect(emitter.metrics().totalFlushed).toBe(1);
  });
});
