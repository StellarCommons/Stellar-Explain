import { describe, it, expect, afterEach } from "vitest";
import { getUserId, newUserId, USER_ID_STORAGE_KEY, attachUserProperties } from "../src/user";
import type { AnalyticsEvent } from "../src/types/events";
import { OPT_OUT_STORAGE_KEY } from "../src/optout";

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

function setLocalStorage(value: unknown): void {
  Object.defineProperty(globalThis, "localStorage", { value, configurable: true });
}

function fakeLocalStorage(store: Record<string, string> = {}) {
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

afterEach(() => {
  setLocalStorage(originalLocalStorage);
});

describe("getUserId", () => {
  it("returns undefined when localStorage is unavailable", () => {
    setLocalStorage(undefined);
    expect(getUserId()).toBeUndefined();
  });

  it("generates and persists an anonymous user ID on first use", () => {
    const store: Record<string, string> = {};
    setLocalStorage(fakeLocalStorage(store));

    const id = getUserId();

    expect(id).toBeTypeOf("string");
    expect(store[USER_ID_STORAGE_KEY]).toBe(id);
  });

  it("reuses the persisted user ID on subsequent calls", () => {
    setLocalStorage(fakeLocalStorage({ [USER_ID_STORAGE_KEY]: "user-42" }));
    expect(getUserId()).toBe("user-42");
  });

  it("treats storage access errors as no user ID", () => {
    setLocalStorage({
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    });
    expect(getUserId()).toBeUndefined();
  });

  it("clears an existing user ID and returns undefined when the user has opted out", () => {
    const store: Record<string, string> = {
      [USER_ID_STORAGE_KEY]: "user-42",
      [OPT_OUT_STORAGE_KEY]: "1",
    };
    setLocalStorage(fakeLocalStorage(store));

    expect(getUserId()).toBeUndefined();
    expect(store[USER_ID_STORAGE_KEY]).toBeUndefined();
  });

  it("does not generate a new ID for an opted-out user with no prior ID", () => {
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "1" }));

    expect(getUserId()).toBeUndefined();
  });
});

describe("newUserId", () => {
  it("returns a non-empty string", () => {
    expect(newUserId()).toBeTypeOf("string");
    expect(newUserId().length).toBeGreaterThan(0);
  });

  it("generates a unique ID each call", () => {
    expect(newUserId()).not.toBe(newUserId());
  });
});

describe("attachUserProperties (issue #85)", () => {
  function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
    return { id: "1", name: "page_view", timestamp: new Date(), ...overrides };
  }

  it("returns the event unchanged when traits is undefined", () => {
    const event = makeEvent();
    expect(attachUserProperties(event, undefined)).toBe(event);
  });

  it("returns the event unchanged when traits is an empty object", () => {
    const event = makeEvent();
    expect(attachUserProperties(event, {})).toBe(event);
  });

  it("merges traits into properties", () => {
    const event = makeEvent({ properties: { path: "/tx/abc" } });
    const result = attachUserProperties(event, { plan: "pro" });
    expect(result.properties).toEqual({ plan: "pro", path: "/tx/abc" });
  });

  it("lets the event's own property win over a trait with the same key", () => {
    const event = makeEvent({ properties: { plan: "override" } });
    const result = attachUserProperties(event, { plan: "pro" });
    expect(result.properties?.plan).toBe("override");
  });
});