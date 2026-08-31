import { describe, it, expect } from "vitest";
import { NoopEmitter } from "../src/emitter/NoopEmitter";
import { EventEmitter } from "../src/emitter/EventEmitter";
import type { AnalyticsEvent } from "../src/types/events";

/**
 * Tests the real `NoopEmitter` exported by the package (issue #96) — the
 * pre-existing `tests/noopEmitter.test.ts` exercises a private inline copy
 * of the same contract and is left untouched.
 */
describe("NoopEmitter", () => {
  const event: AnalyticsEvent = { id: "1", name: "login", timestamp: new Date() };

  it("track() and flush() are true no-ops — no handler ever fires", async () => {
    const emitter = new NoopEmitter();
    let called = false;
    emitter.on("login", () => {
      called = true;
    });

    emitter.track(event);
    await emitter.flush();

    expect(called).toBe(false);
    expect(emitter.queueSize()).toBe(0);
  });

  it("metrics() reports an all-zero, closed-circuit snapshot", () => {
    const emitter = new NoopEmitter();
    emitter.track(event);

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

  it("getDeadLetterQueue() is always empty", () => {
    const emitter = new NoopEmitter();
    emitter.track(event);
    expect(emitter.getDeadLetterQueue()).toEqual([]);
  });

  it("is interchangeable with EventEmitter wherever a consumer only needs the shared surface (issue #96)", async () => {
    async function useEmitter(emitter: EventEmitter | NoopEmitter): Promise<void> {
      emitter.on("login", () => {});
      emitter.track(event);
      await emitter.flush();
      emitter.off("login", () => {});
      emitter.clear();
      emitter.metrics();
      emitter.queueSize();
    }

    await expect(useEmitter(new NoopEmitter())).resolves.toBeUndefined();
    await expect(useEmitter(new EventEmitter())).resolves.toBeUndefined();
  });
});
