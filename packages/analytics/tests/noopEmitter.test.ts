import { describe, it, expect } from "vitest";

class NoopEmitter {
  on(): void {}
  off(): void {}
  track(): void {}
  flush(): void {}
  clear(): void {}
  queueSize(): number { return 0; }
  metrics() {
    return { totalTracked: 0, totalDropped: 0, totalFlushed: 0, queueSize: 0 };
  }
}

describe("NoopEmitter", () => {
  it("on() returns without error", () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.on()).not.toThrow();
  });

  it("off() returns without error", () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.off()).not.toThrow();
  });

  it("track() returns without error", () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.track()).not.toThrow();
  });

  it("flush() returns without error", () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.flush()).not.toThrow();
  });

  it("clear() returns without error", () => {
    const emitter = new NoopEmitter();
    expect(() => emitter.clear()).not.toThrow();
  });

  it("queueSize() returns 0", () => {
    const emitter = new NoopEmitter();
    expect(emitter.queueSize()).toBe(0);
  });

  it("metrics() returns all-zero values", () => {
    const emitter = new NoopEmitter();
    const m = emitter.metrics();
    expect(m).toEqual({ totalTracked: 0, totalDropped: 0, totalFlushed: 0, queueSize: 0 });
  });

  it("multiple operations do not change metrics", () => {
    const emitter = new NoopEmitter();
    emitter.track();
    emitter.track();
    emitter.flush();
    const m = emitter.metrics();
    expect(m.totalTracked).toBe(0);
    expect(m.totalFlushed).toBe(0);
  });
});
