import { describe, it, expect, afterEach } from "vitest";
import { OPT_OUT_STORAGE_KEY, isOptedOutViaLocalStorage } from "../src/optout";

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

describe("isOptedOutViaLocalStorage", () => {
  it("returns false when localStorage is unavailable (Node/SSR)", () => {
    setLocalStorage(undefined);
    expect(isOptedOutViaLocalStorage()).toBe(false);
  });

  it("returns false when the opt-out key is absent", () => {
    setLocalStorage(fakeLocalStorage());
    expect(isOptedOutViaLocalStorage()).toBe(false);
  });

  it("returns true when the opt-out key is present with any value", () => {
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "true" }));
    expect(isOptedOutViaLocalStorage()).toBe(true);
  });

  it("returns true when the opt-out key is present but empty", () => {
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "" }));
    expect(isOptedOutViaLocalStorage()).toBe(true);
  });

  it("returns false, not throwing, when localStorage.getItem throws", () => {
    setLocalStorage({
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(isOptedOutViaLocalStorage()).toBe(false);
  });
});
