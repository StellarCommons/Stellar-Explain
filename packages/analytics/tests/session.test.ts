import { describe, it, expect, afterEach } from "vitest";
import { getSessionId, newSessionId, SESSION_ID_STORAGE_KEY } from "../src/session";

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

  it("generates and persists a session ID on first use", () => {
    const store: Record<string, string> = {};
    setSessionStorage(fakeSessionStorage(store));

    const id = getSessionId();

    expect(id).toBeTypeOf("string");
    expect(store[SESSION_ID_STORAGE_KEY]).toBe(id);
  });

  it("reuses the persisted session ID on subsequent calls", () => {
    setSessionStorage(fakeSessionStorage({ [SESSION_ID_STORAGE_KEY]: "sess-123" }));
    expect(getSessionId()).toBe("sess-123");
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