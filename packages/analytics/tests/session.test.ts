import { describe, it, expect, afterEach } from "vitest";
import {
  getSessionId,
  newSessionId,
  SESSION_ID_STORAGE_KEY,
  SESSION_LAST_ACTIVE_STORAGE_KEY,
  SESSION_INACTIVITY_TIMEOUT_MS,
} from "../src/session";

const originalSessionStorage = (globalThis as { sessionStorage?: unknown }).sessionStorage;

function setSessionStorage(value: unknown): void {
  Object.defineProperty(globalThis, "sessionStorage", { value, configurable: true });
}

function fakeSessionStorage(store: Record<string, string> = {}) {
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    store,
  };
}

afterEach(() => {
  setSessionStorage(originalSessionStorage);
});

describe("getSessionId", () => {
  it("returns undefined when sessionStorage is unavailable", () => {
    setSessionStorage(undefined);
    expect(getSessionId()).toBeUndefined();
  });

  it("generates and persists a new session ID on first use", () => {
    const store: Record<string, string> = {};
    setSessionStorage(fakeSessionStorage(store));

    const id = getSessionId(() => 1_000);

    expect(id).toBeTypeOf("string");
    expect(store[SESSION_ID_STORAGE_KEY]).toBe(id);
    expect(store[SESSION_LAST_ACTIVE_STORAGE_KEY]).toBe("1000");
  });

  it("restores the existing session ID from storage when still within the inactivity window", () => {
    setSessionStorage(
      fakeSessionStorage({
        [SESSION_ID_STORAGE_KEY]: "sess-123",
        [SESSION_LAST_ACTIVE_STORAGE_KEY]: "1000",
      }),
    );

    const id = getSessionId(() => 1000 + SESSION_INACTIVITY_TIMEOUT_MS - 1);

    expect(id).toBe("sess-123");
  });

  it("refreshes the last-active timestamp on every call (sliding window)", () => {
    const store: Record<string, string> = {
      [SESSION_ID_STORAGE_KEY]: "sess-123",
      [SESSION_LAST_ACTIVE_STORAGE_KEY]: "1000",
    };
    setSessionStorage(fakeSessionStorage(store));

    getSessionId(() => 5000);

    expect(store[SESSION_LAST_ACTIVE_STORAGE_KEY]).toBe("5000");
  });

  it("starts a new session once SESSION_INACTIVITY_TIMEOUT_MS has elapsed since the last activity", () => {
    const store: Record<string, string> = {
      [SESSION_ID_STORAGE_KEY]: "sess-123",
      [SESSION_LAST_ACTIVE_STORAGE_KEY]: "1000",
    };
    setSessionStorage(fakeSessionStorage(store));

    const id = getSessionId(() => 1000 + SESSION_INACTIVITY_TIMEOUT_MS);

    expect(id).not.toBe("sess-123");
    expect(store[SESSION_ID_STORAGE_KEY]).toBe(id);
  });

  it("starts a new session when a session ID exists but has no recorded last-active time", () => {
    setSessionStorage(fakeSessionStorage({ [SESSION_ID_STORAGE_KEY]: "sess-123" }));

    expect(getSessionId()).not.toBe("sess-123");
  });

  it("treats storage access errors as no session ID", () => {
    setSessionStorage({
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    });
    expect(getSessionId()).toBeUndefined();
  });
});

describe("newSessionId", () => {
  it("returns a non-empty string", () => {
    expect(newSessionId()).toBeTypeOf("string");
    expect(newSessionId().length).toBeGreaterThan(0);
  });

  it("generates a unique ID each call", () => {
    expect(newSessionId()).not.toBe(newSessionId());
  });
});
