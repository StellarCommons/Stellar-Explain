import { describe, it, expect, afterEach } from "vitest";
import { getOS } from "../src/os";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("getOS", () => {
  it("returns undefined when the user agent is unavailable", () => {
    setNavigator({});
    expect(getOS()).toBeUndefined();
  });

  it("detects Windows", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/128.0" });
    expect(getOS()).toBe("Windows");
  });

  it("detects macOS", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0",
    });
    expect(getOS()).toBe("macOS");
  });

  it("detects iOS ahead of macOS", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1",
    });
    expect(getOS()).toBe("iOS");
  });

  it("detects Android ahead of Linux", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0",
    });
    expect(getOS()).toBe("Android");
  });

  it("detects plain Linux", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0" });
    expect(getOS()).toBe("Linux");
  });
});