import { describe, it, expect } from "vitest";
import { attachGroupContext } from "../src/group";
import type { AnalyticsEvent } from "../src/types/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { id: "1", name: "page_view", timestamp: new Date(), ...overrides };
}

describe("attachGroupContext (issue #86)", () => {
  it("returns the event unchanged when group is undefined", () => {
    const event = makeEvent();
    expect(attachGroupContext(event, undefined)).toBe(event);
  });

  it("attaches groupId and merges properties", () => {
    const event = makeEvent({ properties: { path: "/tx/abc" } });
    const result = attachGroupContext(event, {
      groupId: "org-42",
      properties: { plan: "enterprise" },
    });
    expect(result.groupId).toBe("org-42");
    expect(result.properties).toEqual({ plan: "enterprise", path: "/tx/abc" });
  });

  it("attaches only the groupId when group has no properties", () => {
    const event = makeEvent({ properties: { path: "/tx/abc" } });
    const result = attachGroupContext(event, { groupId: "org-42" });
    expect(result.groupId).toBe("org-42");
    expect(result.properties).toEqual({ path: "/tx/abc" });
  });

  it("lets the event's own groupId win over the group context's id", () => {
    const event = makeEvent({ groupId: "org-explicit" });
    const result = attachGroupContext(event, { groupId: "org-42" });
    expect(result.groupId).toBe("org-explicit");
  });

  it("lets the event's own property win over a group property with the same key", () => {
    const event = makeEvent({ properties: { plan: "override" } });
    const result = attachGroupContext(event, {
      groupId: "org-42",
      properties: { plan: "enterprise" },
    });
    expect(result.properties?.plan).toBe("override");
  });
});
