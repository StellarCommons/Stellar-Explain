import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventQueue, QUEUE_MAX_SIZE, QUEUE_FLUSH_INTERVAL_MS } from "../src/queue";
import { AnalyticsEvent } from "../src/types/events";

// Distinct `properties` per event so the queue's built-in deduplication
// (Analytics #39) doesn't collapse these into a single event — `id` alone
// isn't part of the dedup key, matching real callers where every event gets
// a fresh id regardless of whether its content repeats.
function makeEvent(id: string): AnalyticsEvent {
  return { id, name: "page_view", timestamp: new Date(), properties: { seq: id } };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventQueue", () => {
  it("enqueues an event without flushing until a trigger condition is met", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    queue.enqueue(makeEvent("1"));

    expect(queue.size()).toBe(1);
    expect(onFlush).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("flushes automatically once the queue reaches QUEUE_MAX_SIZE", async () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    for (let i = 0; i < QUEUE_MAX_SIZE; i++) {
      queue.enqueue(makeEvent(String(i)));
    }
    await vi.waitFor(() => expect(onFlush).toHaveBeenCalledTimes(1));

    expect(onFlush).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "0" })]),
    );
    expect(onFlush.mock.calls[0][0]).toHaveLength(QUEUE_MAX_SIZE);
    expect(queue.size()).toBe(0);

    queue.destroy();
  });

  it("flushes automatically once QUEUE_FLUSH_INTERVAL_MS elapses", async () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);
    queue.enqueue(makeEvent("1"));

    await vi.advanceTimersByTimeAsync(QUEUE_FLUSH_INTERVAL_MS);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([expect.objectContaining({ id: "1" })]);
    expect(queue.size()).toBe(0);

    queue.destroy();
  });

  it("does not invoke the flush callback when the interval elapses on an empty queue", async () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    await vi.advanceTimersByTimeAsync(QUEUE_FLUSH_INTERVAL_MS);

    expect(onFlush).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("flush() on an empty queue is a no-op", async () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);

    await queue.flush();

    expect(onFlush).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("takePending drains the queue synchronously without invoking the flush callback (page unload)", () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);
    queue.enqueue(makeEvent("1"));
    queue.enqueue(makeEvent("2"));

    const pending = queue.takePending();

    expect(pending.map((e) => e.id)).toEqual(["1", "2"]);
    expect(queue.size()).toBe(0);
    expect(onFlush).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("collapses concurrent flush calls instead of double-sending", async () => {
    let resolveFlush: () => void = () => {};
    const onFlush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const queue = new EventQueue(onFlush);
    queue.enqueue(makeEvent("1"));

    const first = queue.flush();
    const second = queue.flush(); // already flushing — should return immediately

    resolveFlush();
    await first;
    await second;

    expect(onFlush).toHaveBeenCalledTimes(1);

    queue.destroy();
  });

  it("continues operating after the flush callback throws", async () => {
    const onFlush = vi.fn().mockRejectedValueOnce(new Error("network error"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const queue = new EventQueue(onFlush);
    queue.enqueue(makeEvent("1"));

    await queue.flush();
    expect(errorSpy).toHaveBeenCalled();

    queue.enqueue(makeEvent("2"));
    await queue.flush();

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenLastCalledWith([expect.objectContaining({ id: "2" })]);

    errorSpy.mockRestore();
    queue.destroy();
  });

  it("stops the periodic timer after destroy()", async () => {
    const onFlush = vi.fn();
    const queue = new EventQueue(onFlush);
    queue.enqueue(makeEvent("1"));

    queue.destroy();
    await vi.advanceTimersByTimeAsync(QUEUE_FLUSH_INTERVAL_MS);

    expect(onFlush).not.toHaveBeenCalled();
  });
});
