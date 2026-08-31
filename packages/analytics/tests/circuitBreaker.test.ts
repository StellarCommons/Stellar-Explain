import { describe, it, expect } from "vitest";
import { CircuitBreaker } from "../src/lib/circuitBreaker";

describe("CircuitBreaker (issue #97)", () => {
  it("starts closed and lets every call through", () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe("closed");
    expect(breaker.canPass()).toBe(true);
  });

  it("stays closed through fewer than the failure threshold", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    for (let i = 0; i < 4; i++) {
      expect(breaker.canPass()).toBe(true);
      breaker.recordFailure();
    }
    expect(breaker.getState()).toBe("closed");
  });

  it("opens after the 5th consecutive failure and refuses calls", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    for (let i = 0; i < 5; i++) {
      breaker.canPass();
      breaker.recordFailure();
    }
    expect(breaker.getState()).toBe("open");
    expect(breaker.canPass()).toBe(false);
  });

  it("a success resets the consecutive-failure count", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    // Another 4 failures alone should not trip it — the streak was reset.
    for (let i = 0; i < 4; i++) breaker.recordFailure();
    expect(breaker.getState()).toBe("closed");
  });

  it("stays open for the full cooldown, then allows exactly one half-open trial", () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      cooldownMs: 60_000,
      now: () => now,
    });
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    expect(breaker.getState()).toBe("open");

    now += 59_999;
    expect(breaker.canPass()).toBe(false);
    expect(breaker.getState()).toBe("open");

    now += 1;
    expect(breaker.canPass()).toBe(true);
    expect(breaker.getState()).toBe("half-open");

    // The trial is already in flight — a second concurrent call must not
    // also be let through.
    expect(breaker.canPass()).toBe(false);
  });

  it("closes on a successful half-open trial", () => {
    let now = 0;
    const breaker = new CircuitBreaker({ cooldownMs: 60_000, now: () => now });
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    now += 60_000;
    expect(breaker.canPass()).toBe(true); // enters half-open

    breaker.recordSuccess();

    expect(breaker.getState()).toBe("closed");
    expect(breaker.canPass()).toBe(true);
  });

  it("reopens for another full cooldown when the half-open trial itself fails", () => {
    let now = 0;
    const breaker = new CircuitBreaker({ cooldownMs: 60_000, now: () => now });
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    now += 60_000;
    expect(breaker.canPass()).toBe(true); // enters half-open

    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");

    now += 59_999;
    expect(breaker.canPass()).toBe(false);

    now += 1;
    expect(breaker.canPass()).toBe(true);
    expect(breaker.getState()).toBe("half-open");
  });
});
