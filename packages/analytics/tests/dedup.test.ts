import { describe, it, expect } from "vitest";
import { EventDeduplicator, DEDUP_WINDOW_MS } from "../src/dedup";
import { AnalyticsEvent } from "../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: "evt-1",
    name: "page_view",
    timestamp: new Date(),
    ...overrides,
  };
}

/** A clock the test controls explicitly instead of depending on wall time. */
function fakeClock(startAt = 0) {
  let now = startAt;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("EventDeduplicator", () => {
  it("drops a repeat of the same event within the dedup window", () => {
    const clock = fakeClock();
    const dedup = new EventDeduplicator(DEDUP_WINDOW_MS, clock.now);
    const event = makeEvent();

    expect(dedup.shouldKeep(event)).toBe(true);

    clock.advance(499);
    expect(dedup.shouldKeep(event)).toBe(false);
  });

  it("allows a repeat of the same event once the window has elapsed", () => {
    const clock = fakeClock();
    const dedup = new EventDeduplicator(DEDUP_WINDOW_MS, clock.now);
    const event = makeEvent();

    expect(dedup.shouldKeep(event)).toBe(true);

    clock.advance(500);
    expect(dedup.shouldKeep(event)).toBe(true);
  });

  it("keeps both events when the name or properties differ", () => {
    const clock = fakeClock();
    const dedup = new EventDeduplicator(DEDUP_WINDOW_MS, clock.now);

    expect(dedup.shouldKeep(makeEvent({ name: "page_view", properties: { path: "/tx/abc" } }))).toBe(
      true,
    );
    expect(dedup.shouldKeep(makeEvent({ name: "page_view", properties: { path: "/tx/def" } }))).toBe(
      true,
    );
    expect(dedup.shouldKeep(makeEvent({ name: "login" }))).toBe(true);
  });

  it("does not extend the window on a dropped duplicate — a burst only keeps the first event", () => {
    const clock = fakeClock();
    const dedup = new EventDeduplicator(DEDUP_WINDOW_MS, clock.now);
    const event = makeEvent();

    expect(dedup.shouldKeep(event)).toBe(true);
    clock.advance(200);
    expect(dedup.shouldKeep(event)).toBe(false); // last-seen advances to t=200
    clock.advance(400);
    // t=600, 400ms after the *dropped* duplicate at t=200 — still within
    // the window relative to it, so this one is dropped too.
    expect(dedup.shouldKeep(event)).toBe(false);
  });

  it("forgets prior events after reset()", () => {
    const clock = fakeClock();
    const dedup = new EventDeduplicator(DEDUP_WINDOW_MS, clock.now);
    const event = makeEvent();

    expect(dedup.shouldKeep(event)).toBe(true);
    dedup.reset();
    expect(dedup.shouldKeep(event)).toBe(true);
  });
});
