import { describe, it, expect, afterEach } from "vitest";
import { getLocale } from "../src/locale";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("getLocale", () => {
  it("returns undefined when navigator is unavailable", () => {
    setNavigator(undefined);
    expect(getLocale()).toBeUndefined();
  });

  it("returns undefined when navigator.language is unavailable", () => {
    setNavigator({});
    expect(getLocale()).toBeUndefined();
  });

  it("returns navigator.language when present", () => {
    setNavigator({ language: "en-US" });
    expect(getLocale()).toBe("en-US");
  });

  it("returns a non-English locale as-is", () => {
    setNavigator({ language: "fr-FR" });
    expect(getLocale()).toBe("fr-FR");
  });

  it("returns undefined for an empty string language", () => {
    setNavigator({ language: "" });
    expect(getLocale()).toBeUndefined();
  });
});
