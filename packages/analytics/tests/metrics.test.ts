import { describe, it, expect, vi } from "vitest";
import { AnalyticsEvent } from "../src/types/events";

class MonitoredEmitter {
  private tracked = 0;
  private dropped = 0;
  private flushed = 0;
  private queue: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent): void {
    this.tracked++;
    this.queue.push(event);
  }

  flush(): void {
    this.flushed += this.queue.length;
    this.queue = [];
  }

  drop(reason?: string): void {
    this.dropped++;
  }

  metrics() {
    return {
      totalTracked: this.tracked,
      totalDropped: this.dropped,
      totalFlushed: this.flushed,
      queueSize: this.queue.length,
    };
  }
}

function makeEvent(name: string = "page_view"): AnalyticsEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    name: name as any,
    timestamp: new Date(),
    sessionId: "sess-test",
  };
}

describe("metrics snapshot", () => {
  it("starts with all-zero metrics", () => {
    const emitter = new MonitoredEmitter();
    const m = emitter.metrics();
    expect(m.totalTracked).toBe(0);
    expect(m.totalDropped).toBe(0);
    expect(m.totalFlushed).toBe(0);
    expect(m.queueSize).toBe(0);
  });

  it("reflects totalTracked after tracking events", () => {
    const emitter = new MonitoredEmitter();
    emitter.track(makeEvent());
    emitter.track(makeEvent());
    emitter.track(makeEvent());
    expect(emitter.metrics().totalTracked).toBe(3);
  });

  it("reflects totalFlushed after flush", () => {
    const emitter = new MonitoredEmitter();
    emitter.track(makeEvent());
    emitter.track(makeEvent());
    emitter.flush();
    const m = emitter.metrics();
    expect(m.totalFlushed).toBe(2);
    expect(m.queueSize).toBe(0);
  });

  it("reflects totalDropped after drops", () => {
    const emitter = new MonitoredEmitter();
    emitter.drop("invalid");
    emitter.drop("rate_limited");
    expect(emitter.metrics().totalDropped).toBe(2);
  });

  it("reflects queueSize while events are queued", () => {
    const emitter = new MonitoredEmitter();
    emitter.track(makeEvent());
    emitter.track(makeEvent());
    expect(emitter.metrics().queueSize).toBe(2);
  });

  it("queueSize resets to 0 after flush", () => {
    const emitter = new MonitoredEmitter();
    emitter.track(makeEvent());
    emitter.flush();
    expect(emitter.metrics().queueSize).toBe(0);
  });

  it("accurately reflects a sequence of mixed operations", () => {
    const emitter = new MonitoredEmitter();
    emitter.track(makeEvent());
    emitter.track(makeEvent());
    emitter.drop("timeout");
    emitter.flush();
    emitter.track(makeEvent());
    const m = emitter.metrics();
    expect(m.totalTracked).toBe(3);
    expect(m.totalDropped).toBe(1);
    expect(m.totalFlushed).toBe(2);
    expect(m.queueSize).toBe(1);
  });

  it("returns a new object each time", () => {
    const emitter = new MonitoredEmitter();
    const m1 = emitter.metrics();
    const m2 = emitter.metrics();
    expect(m1).toEqual(m2);
    expect(m1).not.toBe(m2);
  });
});
