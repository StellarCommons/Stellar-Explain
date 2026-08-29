import { describe, it, expect, afterEach } from "vitest";
import { getDeviceType } from "../src/device";

const originalWindow = (globalThis as { window?: unknown }).window;

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

afterEach(() => {
  setWindow(originalWindow);
});

describe("getDeviceType", () => {
  it("returns undefined outside a browser", () => {
    setWindow(undefined);
    expect(getDeviceType()).toBeUndefined();
  });

  it("detects mobile below 768px", () => {
    setWindow({ innerWidth: 375 });
    expect(getDeviceType()).toBe("mobile");
  });

  it("detects tablet between 768px and 1023px", () => {
    setWindow({ innerWidth: 768 });
    expect(getDeviceType()).toBe("tablet");
  });

  it("detects desktop at 1024px and above", () => {
    setWindow({ innerWidth: 1024 });
    expect(getDeviceType()).toBe("desktop");
  });
});