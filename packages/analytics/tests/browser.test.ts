import { describe, it, expect, afterEach } from "vitest";
import { getBrowser } from "../src/browser";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("getBrowser", () => {
  it("returns undefined when the user agent is unavailable", () => {
    setNavigator({});
    expect(getBrowser()).toBeUndefined();
  });

  it("detects Edge ahead of Chrome", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    });
    expect(getBrowser()).toBe("Edge");
  });

  it("detects Firefox", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" });
    expect(getBrowser()).toBe("Firefox");
  });

  it("detects Chrome before Safari", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    expect(getBrowser()).toBe("Chrome");
  });

  it("detects Safari on iOS (CriOS handled as Chrome)", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(getBrowser()).toBe("Safari");
  });

  it("returns undefined for unknown user agents", () => {
    setNavigator({ userAgent: "curl/8.0 pidgin" });
    expect(getBrowser()).toBeUndefined();
  });
});