import { describe, it, expect, vi } from "vitest";

class Flusher<T> {
  private queue: T[] = [];
  private flushing = false;

  constructor(
    private readonly batchSize: number,
    private readonly sink: (batch: T[]) => void,
  ) {}

  enqueue(item: T): void {
    this.queue.push(item);
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        this.sink(batch);
      }
    } finally {
      this.flushing = false;
    }
  }

  size(): number {
    return this.queue.length;
  }
}

describe("flush", () => {
  it("delivers events to the sink in batches of the configured size", async () => {
    const sink = vi.fn();
    const flusher = new Flusher<number>(2, sink);
    [1, 2, 3].forEach((n) => flusher.enqueue(n));
    await flusher.flush();
    expect(sink).toHaveBeenCalledWith([1, 2]);
    expect(sink).toHaveBeenCalledWith([3]);
  });

  it("drains the queue atomically, leaving it empty after flush", async () => {
    const flusher = new Flusher<number>(10, vi.fn());
    flusher.enqueue(1);
    await flusher.flush();
    expect(flusher.size()).toBe(0);
  });

  it("does not double-send when flush is called concurrently", async () => {
    const sink = vi.fn();
    const flusher = new Flusher<number>(10, sink);
    flusher.enqueue(1);
    await Promise.all([flusher.flush(), flusher.flush()]);
    expect(sink).toHaveBeenCalledTimes(1);
  });
});
