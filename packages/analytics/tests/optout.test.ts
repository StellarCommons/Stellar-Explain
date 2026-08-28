import { describe, it, expect, afterEach } from "vitest";
import {
  OPT_OUT_STORAGE_KEY,
  isOptedOut,
  isOptedOutViaLocalStorage,
  isOptedOutViaDoNotTrack,
} from "../src/optout";

const originalNavigator = globalThis.navigator;
const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

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
  setNavigator(originalNavigator);
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

describe("isOptedOutViaDoNotTrack", () => {
  it("returns false when navigator is unavailable (Node/SSR)", () => {
    setNavigator(undefined);
    expect(isOptedOutViaDoNotTrack()).toBe(false);
  });

  it("returns true when navigator.doNotTrack is '1'", () => {
    setNavigator({ doNotTrack: "1" });
    expect(isOptedOutViaDoNotTrack()).toBe(true);
  });

  it("returns false when navigator.doNotTrack is unset", () => {
    setNavigator({});
    expect(isOptedOutViaDoNotTrack()).toBe(false);
  });

  it("returns false when navigator.doNotTrack is '0'", () => {
    setNavigator({ doNotTrack: "0" });
    expect(isOptedOutViaDoNotTrack()).toBe(false);
  });
});

describe("isOptedOut", () => {
  it("is true when the localStorage flag is present", () => {
    setNavigator({});
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "1" }));
    expect(isOptedOut()).toBe(true);
  });

  it("is true when Do Not Track is enabled", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());
    expect(isOptedOut()).toBe(true);
  });

  it("is false when neither signal is present", () => {
    setNavigator({});
    setLocalStorage(fakeLocalStorage());
    expect(isOptedOut()).toBe(false);
  });

  it("ignores Do Not Track when ignoreDnt is true", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage());
    expect(isOptedOut(true)).toBe(false);
  });

  it("still honors the localStorage flag when ignoreDnt is true", () => {
    setNavigator({ doNotTrack: "1" });
    setLocalStorage(fakeLocalStorage({ [OPT_OUT_STORAGE_KEY]: "1" }));
    expect(isOptedOut(true)).toBe(true);
  });
});
