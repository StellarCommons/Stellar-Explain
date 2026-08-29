import { describe, it, expect, afterEach } from "vitest";
import { getUserId, newUserId, USER_ID_STORAGE_KEY } from "../src/user";

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