import { describe, it, expect } from "vitest";

interface FailedEvent<T> {
  event: T;
  error: string;
}

class DeadLetterQueue<T> {
  private items: FailedEvent<T>[] = [];

  constructor(private readonly maxSize: number = 100) {}

  add(event: T, error: string): void {
    this.items.push({ event, error });
    if (this.items.length > this.maxSize) this.items.shift();
  }

  size(): number {
    return this.items.length;
  }

  replayDlq(sink: (event: T) => void): void {
    const pending = [...this.items];
    this.clearDlq();
    for (const { event } of pending) sink(event);
  }

  clearDlq(): void {
    this.items = [];
  }
}

describe("DeadLetterQueue", () => {
  it("collects events that fail sink delivery", () => {
    const dlq = new DeadLetterQueue<string>();
    dlq.add("event-a", "network error");
    expect(dlq.size()).toBe(1);
  });

  it("evicts the oldest entry once max size is exceeded", () => {
    const dlq = new DeadLetterQueue<string>(2);
    dlq.add("a", "err");
    dlq.add("b", "err");
    dlq.add("c", "err");
    expect(dlq.size()).toBe(2);
  });

  it("replayDlq() re-delivers queued events and empties the queue", () => {
    const dlq = new DeadLetterQueue<string>();
    dlq.add("a", "err");
    dlq.add("b", "err");
    const replayed: string[] = [];
    dlq.replayDlq((event) => replayed.push(event));
    expect(replayed).toEqual(["a", "b"]);
    expect(dlq.size()).toBe(0);
  });

  it("clearDlq() empties the queue without replaying", () => {
    const dlq = new DeadLetterQueue<string>();
    dlq.add("a", "err");
    dlq.clearDlq();
    expect(dlq.size()).toBe(0);
  });
});
