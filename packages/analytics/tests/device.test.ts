import { describe, it, expect, afterEach } from "vitest";
import { getDeviceType, MOBILE_BREAKPOINT_PX, TABLET_BREAKPOINT_PX } from "../src/device";

const originalWindow = (globalThis as { window?: unknown }).window;

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

afterEach(() => {
  setWindow(originalWindow);
});

describe("getDeviceType", () => {
  it("returns undefined when window is unavailable", () => {
    setWindow(undefined);
    expect(getDeviceType()).toBeUndefined();
  });

  it("returns 'mobile' for a mobile viewport width", () => {
    setWindow({ innerWidth: MOBILE_BREAKPOINT_PX - 1 });
    expect(getDeviceType()).toBe("mobile");
  });

  it("returns 'tablet' for a tablet viewport width", () => {
    setWindow({ innerWidth: MOBILE_BREAKPOINT_PX + 1 });
    expect(getDeviceType()).toBe("tablet");
  });

  it("returns 'desktop' for a desktop viewport width", () => {
    setWindow({ innerWidth: TABLET_BREAKPOINT_PX + 1 });
    expect(getDeviceType()).toBe("desktop");
  });

  it("returns undefined when innerWidth is not a number", () => {
    setWindow({ innerWidth: "wide" });
    expect(getDeviceType()).toBeUndefined();
  });
});
