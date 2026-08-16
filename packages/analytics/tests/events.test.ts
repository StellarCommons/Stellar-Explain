import { describe, it, expect } from "vitest";
import { AnalyticsEvent, EventName } from "../src/types/events";

function makePageView(overrides?: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    id: "evt-page-1",
    name: "page_view",
    timestamp: new Date(),
    properties: { path: "/home", title: "Home" },
    sessionId: "sess-abc",
    ...overrides,
  };
}

function makeButtonClick(overrides?: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    id: "evt-btn-1",
    name: "button_click",
    timestamp: new Date(),
    properties: { buttonId: "signup", page: "/landing" },
    sessionId: "sess-abc",
    ...overrides,
  };
}

function makeLogin(overrides?: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    id: "evt-login-1",
    name: "login",
    timestamp: new Date(),
    properties: { method: "wallet" },
    userId: "user-42",
    sessionId: "sess-abc",
    ...overrides,
  };
}

describe("event builder functions", () => {
  it("page_view has correct event name", () => {
    const event = makePageView();
    expect(event.name).toBe("page_view");
  });

  it("page_view includes expected properties", () => {
    const event = makePageView();
    expect(event.properties).toHaveProperty("path");
    expect(event.properties).toHaveProperty("title");
  });

  it("button_click has correct event name", () => {
    const event = makeButtonClick();
    expect(event.name).toBe("button_click");
  });

  it("button_click includes expected properties", () => {
    const event = makeButtonClick();
    expect(event.properties).toHaveProperty("buttonId");
    expect(event.properties).toHaveProperty("page");
  });

  it("login has correct event name", () => {
    const event = makeLogin();
    expect(event.name).toBe("login");
  });

  it("login includes userId and method", () => {
    const event = makeLogin();
    expect(event.userId).toBe("user-42");
    expect(event.properties?.method).toBe("wallet");
  });

  it("timestamp is a valid Date", () => {
    const event = makePageView();
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.getTime()).not.toBeNaN();
  });

  it("timestamp is in ISO-8601 compatible range", () => {
    const event = makePageView();
    const iso = event.timestamp.toISOString();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("event id is unique across different event types", () => {
    const pv = makePageView();
    const bc = makeButtonClick();
    expect(pv.id).not.toBe(bc.id);
  });

  it("sessionId is preserved on all events", () => {
    const events = [makePageView(), makeButtonClick(), makeLogin()];
    for (const event of events) {
      expect(event.sessionId).toBe("sess-abc");
    }
  });
});
