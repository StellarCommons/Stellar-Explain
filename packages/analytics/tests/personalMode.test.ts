import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildPersonalModeToggleEvent } from "../src/events/personal-mode";
import { AnalyticsClient } from "../src/client";

describe("buildPersonalModeToggleEvent", () => {
  it("builds a toggle event when personal mode is enabled", () => {
    const event = buildPersonalModeToggleEvent(true);

    expect(event.name).toBe("personal_mode_toggle");
    expect(event.properties.enabled).toBe(true);
  });

  it("builds a toggle event when personal mode is disabled", () => {
    const event = buildPersonalModeToggleEvent(false);
    expect(event.properties.enabled).toBe(false);
  });
});

describe("AnalyticsClient.trackPersonalModeToggle", () => {
  it("queues a personal_mode_toggle event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPersonalModeToggle(true);

    await client.flush();
    const event = flushed[0] as { name?: string; properties?: Record<string, unknown> };
    expect(event.name).toBe("personal_mode_toggle");
    expect(event.properties).toEqual({ enabled: true });
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the personal_mode_toggle event name", () => {
    expect(EventName).toContain("personal_mode_toggle");
  });
});