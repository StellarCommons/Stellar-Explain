import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventQueue } from "../src/queue";
import { AnalyticsEvent } from "../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { id: "1", name: "page_view", timestamp: new Date(), ...overrides };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventQueue deduplication (Analytics #39)", () => {
  it("drops a repeat of the same event (name + properties) enqueued within the window", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    queue.enqueue(makeEvent({ properties: { path: "/tx/abc" } }));
    queue.enqueue(makeEvent({ id: "2", properties: { path: "/tx/abc" } }));

    expect(queue.size()).toBe(1);
    queue.destroy();
  });

  it("keeps both events when their properties differ", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    queue.enqueue(makeEvent({ properties: { path: "/tx/abc" } }));
    queue.enqueue(makeEvent({ id: "2", properties: { path: "/tx/def" } }));

    expect(queue.size()).toBe(2);
    queue.destroy();
  });

  it("keeps both events when their names differ", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    queue.enqueue(makeEvent({ name: "page_view" }));
    queue.enqueue(makeEvent({ id: "2", name: "login" }));

    expect(queue.size()).toBe(2);
    queue.destroy();
  });

  it("allows a repeat once the dedup window has elapsed", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    queue.enqueue(makeEvent({ properties: { path: "/tx/abc" } }));
    vi.advanceTimersByTime(500);
    queue.enqueue(makeEvent({ id: "2", properties: { path: "/tx/abc" } }));

    expect(queue.size()).toBe(2);
    queue.destroy();
  });
});
